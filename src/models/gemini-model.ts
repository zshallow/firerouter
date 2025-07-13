import { Model } from "../interfaces/model";
import { KeyProvider } from "../interfaces/key-provider.js";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response.js";
import {
	FireChatCompletionChunk,
	FireChatCompletionStreamingResponse,
} from "../types/fire-chat-completion-streaming-response.js";
import { EventSourceParserStream } from "eventsource-parser/stream";
import { RequestContext } from "../types/request-context.js";
import {
	GeminiRequest,
	GeminiRequestContent,
	GeminiRequestPart,
	GeminiResponse,
	GeminiResponseSchema,
	GeminiStreamingResponseChunk,
	GeminiStreamingResponseChunkSchema,
} from "../types/gemini-types.js";
import { Processor } from "../interfaces/processor";
import YAML from "yaml";

export class GeminiModel implements Model {
	readonly keyProvider: KeyProvider;
	readonly processor: Processor | undefined;
	readonly url: string;
	readonly modelName: string;

	constructor(
		keyProvider: KeyProvider,
		processor: Processor | undefined,
		url: string,
		modelName: string,
	) {
		this.keyProvider = keyProvider;
		this.processor = processor;
		this.url = url;
		this.modelName = modelName;
	}

	private convertRequestBody(
		req: FireChatCompletionRequest,
	): GeminiRequest {
		const systemInstruction: GeminiRequestContent = { parts: [] };
		const content: GeminiRequestContent[] = [];

		let systemInstructionsDone = false;
		for (const message of req.messages) {
			const parts: GeminiRequestPart[] = [];
			if (typeof message.content === "string") {
				parts.push({ text: message.content });
			} else
				for (const contentPart of message.content) {
					parts.push({ text: contentPart.text });
				}

			if (
				systemInstructionsDone ||
				["assistant", "user"].includes(message.role)
			) {
				systemInstructionsDone = true;

				content.push({
					role:
						message.role !== "assistant"
							? "user"
							: "model",
					parts: parts,
				});
			} else {
				systemInstruction.parts.push(...parts);
			}
		}

		return {
			contents: content,
			systemInstruction:
				systemInstruction.parts.length > 0
					? systemInstruction
					: undefined,
			generationConfig: {
				stopSequences:
					typeof req.stop === "string"
						? [req.stop]
						: req.stop,
				maxOutputTokens: req.max_completion_tokens,
				temperature: req.temperature,
				topK: req.top_k,
				topP: req.top_p,
				presencePenalty: req.presence_penalty,
				frequencyPenalty: req.frequency_penalty,
			},
			safetySettings: [
				{
					category: "HARM_CATEGORY_CIVIC_INTEGRITY",
					threshold: "OFF",
				},
				{
					category: "HARM_CATEGORY_HARASSMENT",
					threshold: "OFF",
				},
				{
					category: "HARM_CATEGORY_DANGEROUS_CONTENT",
					threshold: "OFF",
				},
				{
					category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
					threshold: "OFF",
				},
				{
					category: "HARM_CATEGORY_HATE_SPEECH",
					threshold: "OFF",
				},
			],
		};
	}

	private resToRes(r: GeminiResponse): FireChatCompletionResponse {
		return {
			choices: r.candidates.map(function (candidate, index) {
				return {
					index: index,
					message: {
						content: candidate.content.parts
							.map(
								(part) =>
									part.text,
							)
							.join("\n\n"),
						role: "assistant",
					},
				};
			}),
		};
	}

	private chunkToChunk(
		c: GeminiStreamingResponseChunk,
	): FireChatCompletionChunk {
		return {
			object: "chat.completion.chunk",
			model: c.modelVersion,
			choices: c.candidates.map(function (candidate, index) {
				return {
					index: index,
					delta: {
						role: "assistant",
						content: candidate.content.parts
							.map(
								(part) =>
									part.text,
							)
							.join(""),
					},
				};
			}),
		};
	}

	doRequest(
		req: FireChatCompletionRequest,
		ctx: RequestContext,
	): Promise<FireChatCompletionResponse> {
		if (this.processor !== undefined) {
			req = this.processor.process(req);
			console.debug("Processed request body!");
			console.debug(YAML.stringify(req));
		}

		return this.keyProvider.withKey(
			ctx.signal,
			async (
				key: string,
			): Promise<FireChatCompletionResponse> => {
				const response = await fetch(
					`${this.url}/${this.modelName}:generateContent?key=${key}`,
					{
						method: "POST",
						headers: {
							"Content-Type":
								"application/json",
						},
						body: JSON.stringify(
							this.convertRequestBody(
								req,
							),
						),
						signal: ctx.signal,
					},
				);

				if (!response.ok) {
					ctx.logger.error(
						`Gemini response status: ${response.statusText}`,
					);
					ctx.logger.error(
						`Gemini response body: ${await response.text()}`,
					);
					throw new Error(
						"Error performing request!",
					);
				}

				const ps = GeminiResponseSchema.parse(
					await response.json(),
				);
				return this.resToRes(ps);
			},
		);
	}

	/**
	 * This is some very stupid and by the books code it just looks long and scary due to funny typing.
	 */
	doStreamingRequest(
		req: FireChatCompletionRequest,
		ctx: RequestContext,
	): FireChatCompletionStreamingResponse {
		if (this.processor !== undefined) {
			req = this.processor.process(req);
			console.debug("Processed request body!");
			console.debug(YAML.stringify(req));
		}

		const _this = this;

		return this.keyProvider.withKey(
			ctx.signal,
			async function* (
				key: string,
			): FireChatCompletionStreamingResponse {
				const response = await fetch(
					`${_this.url}/${_this.modelName}:streamGenerateContent?alt=sse&key=${key}`,
					{
						method: "POST",
						headers: {
							"Content-Type":
								"application/json",
							Accept: "text/event-stream",
						},
						body: JSON.stringify(
							_this.convertRequestBody(
								req,
							),
						),
						signal: ctx.signal,
					},
				);

				if (!response.ok || !response.body) {
					ctx.logger.error(
						`Gemini response status: ${response.statusText}`,
					);
					ctx.logger.error(
						`Gemini response body: ${await response.text()}`,
					);
					throw new Error(
						"Error performing request!",
					);
				}

				const pipe = response.body
					.pipeThrough(new TextDecoderStream())
					.pipeThrough(
						new EventSourceParserStream(),
					);

				for await (const event of pipe) {
					const data: unknown = JSON.parse(
						event.data,
					);
					const chunkParse =
						GeminiStreamingResponseChunkSchema.safeParse(
							data,
						);

					if (!chunkParse.success) {
						continue;
					}

					const chunk = chunkParse.data;
					yield _this.chunkToChunk(chunk);
				}
			},
		);
	}
}
