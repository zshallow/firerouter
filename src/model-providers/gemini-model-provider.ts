import { ModelProvider } from "../interfaces/model-provider.js";
import { KeyProvider } from "../interfaces/key-provider.js";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response.js";
import { FireChatCompletionStreamingResponse } from "../types/fire-chat-completion-streaming-response.js";
import { UnionKeyProvider } from "../key-providers/union-key-provider.js";
import { EventSourceParserStream } from "eventsource-parser/stream";
import { GeminiModelProviderConfiguration } from "../config.js";
import { RequestContext } from "../types/request-context.js";
import {
	GeminiRequest,
	GeminiRequestContent,
	GeminiRequestPart,
	GeminiResponseSchema,
	GeminiStreamingResponseChunkSchema,
} from "../types/gemini-types.js";

export class GeminiModelProvider implements ModelProvider {
	config: GeminiModelProviderConfiguration;
	keyProvider: UnionKeyProvider;

	addKeyProvider(keyProvider: KeyProvider): void {
		this.keyProvider.addKeyProvider(keyProvider);
	}

	constructor(conf: GeminiModelProviderConfiguration) {
		this.config = conf;
		this.keyProvider = new UnionKeyProvider([]);

		if (this.config.url.endsWith("/")) {
			this.config.url = this.config.url.substring(
				0,
				this.config.url.length - 1,
			);
		}

		if (this.config.url.toLowerCase().endsWith("v1beta/models")) {
			return;
		}

		if (this.config.url.toLowerCase().endsWith("v1beta")) {
			this.config.url += "/models";
		} else {
			this.config.url += "/v1beta/models";
		}
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

	async doRequest(
		req: FireChatCompletionRequest,
		ctx: RequestContext,
	): Promise<FireChatCompletionResponse> {
		const key = this.keyProvider.provide();

		const response = await fetch(
			`${this.config.url}/${this.config.modelName}:generateContent?key=${key}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(
					this.convertRequestBody(req),
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
			throw new Error("Error performing request!");
		}

		const ps = GeminiResponseSchema.parse(await response.json());

		return {
			choices: ps.candidates.map(function (candidate, index) {
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

	/**
	 * This is some very stupid and by the books code it just looks long and scary due to funny typing.
	 */
	async *doStreamingRequest(
		req: FireChatCompletionRequest,
		ctx: RequestContext,
	): FireChatCompletionStreamingResponse {
		const key = this.keyProvider.provide();

		const response = await fetch(
			`${this.config.url}/${this.config.modelName}:streamGenerateContent?alt=sse&key=${key}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "text/event-stream",
				},
				body: JSON.stringify(
					this.convertRequestBody(req),
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
			throw new Error("Error performing request!");
		}

		const pipe = response.body
			.pipeThrough(new TextDecoderStream())
			.pipeThrough(new EventSourceParserStream());

		for await (const event of pipe) {
			const data: unknown = JSON.parse(event.data);
			const chunkParse =
				GeminiStreamingResponseChunkSchema.safeParse(
					data,
				);

			if (!chunkParse.success) {
				continue;
			}

			const chunk = chunkParse.data;
			yield {
				object: "chat.completion.chunk",
				model: chunk.modelVersion,
				choices: chunk.candidates.map(
					function (candidate, index) {
						return {
							index: index,
							delta: {
								role: "assistant",
								content: candidate.content.parts
									.map(
										(
											part,
										) =>
											part.text,
									)
									.join(
										"",
									),
							},
						};
					},
				),
			};
		}
	}
}
