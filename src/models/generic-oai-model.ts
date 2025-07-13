import { Model } from "../interfaces/model";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response.js";
import { EventSourceParserStream } from "eventsource-parser/stream";
import { KeyProvider } from "../interfaces/key-provider.js";
import { FireChatCompletionStreamingResponse } from "../types/fire-chat-completion-streaming-response.js";
import { RequestContext } from "../types/request-context.js";
import {
	GenericOAIRequest,
	GenericOAIResponseSchema,
	GenericOAIStreamingResponseChunkSchema,
} from "../types/oai-types.js";
import { Processor } from "../interfaces/processor";
import YAML from "yaml";

export class GenericOAIModel implements Model {
	keyProvider: KeyProvider;
	processor: Processor | undefined;
	modelName: string;
	url: string;

	constructor(
		keyProvider: KeyProvider,
		processor: Processor | undefined,
		url: string,
		modelName: string,
	) {
		console.log("Initializing a new GenericOAI model provider!");

		this.keyProvider = keyProvider;
		this.processor = processor;
		this.url = url;
		this.modelName = modelName;
	}

	private convertRequestBody(
		req: FireChatCompletionRequest,
	): GenericOAIRequest {
		return {
			model: this.modelName,
			messages: req.messages,
			stream: req.stream || false,
			max_tokens: req.max_tokens ?? req.max_completion_tokens,
			max_completion_tokens:
				req.max_completion_tokens ?? req.max_tokens,
			seed: req.seed,
			temperature: req.temperature,
			top_p: req.top_p,
			top_k: req.top_k,
			top_a: req.top_a,
			frequency_penalty: req.frequency_penalty,
			presence_penalty: req.presence_penalty,
			repetition_penalty: req.repetition_penalty,
			min_p: req.min_p,
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
					`${this.url}/chat/completions`,
					{
						method: "POST",
						headers: {
							"Content-Type":
								"application/json",
							Authorization: `Bearer ${key}`,
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
						`OAI response status: ${response.statusText}`,
					);
					ctx.logger.error(
						`OAI response body: ${await response.text()}`,
					);
					throw new Error(
						"Error performing request!",
					);
				}

				return GenericOAIResponseSchema.parse(
					await response.json(),
				);
			},
		);
	}

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
					`${_this.url}/chat/completions`,
					{
						method: "POST",
						headers: {
							"Content-Type":
								"application/json",
							Authorization: `Bearer ${key}`,
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
						`GenericOAI response status: ${response.statusText}`,
					);
					ctx.logger.error(
						`GenericOAI response body: ${await response.text()}`,
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
					if (event.data.trim() === "[DONE]") {
						continue;
					}

					const data: unknown = JSON.parse(
						event.data,
					);
					const chunkParse =
						GenericOAIStreamingResponseChunkSchema.safeParse(
							data,
						);
					if (!chunkParse.success) {
						ctx.logger.debug(
							`Got chunk ${JSON.stringify(data)}`,
						);
						continue;
					}

					const chunk = chunkParse.data;
					yield chunk;
				}
			},
		);
	}
}
