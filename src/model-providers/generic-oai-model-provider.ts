import { ModelProvider } from "../interfaces/model-provider.js";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response.js";
import { EventSourceParserStream } from "eventsource-parser/stream";
import { UnionKeyProvider } from "../key-providers/union-key-provider.js";
import { KeyProvider } from "../interfaces/key-provider.js";
import { FireChatCompletionStreamingResponse } from "../types/fire-chat-completion-streaming-response.js";
import { GenericOAIModelProviderConfiguration } from "../config.js";
import { RequestContext } from "../types/request-context.js";
import {
	GenericOAIRequest,
	GenericOAIResponseSchema,
	GenericOAIStreamingResponseChunkSchema,
} from "../types/oai-types.js";

export class GenericOAIModelProvider implements ModelProvider {
	keyProvider: UnionKeyProvider;
	config: GenericOAIModelProviderConfiguration;

	constructor(config: GenericOAIModelProviderConfiguration) {
		console.log("Initializing a new GenericOAI model provider!");

		this.keyProvider = new UnionKeyProvider([]);
		this.config = config;

		// Ensure the URL doesn't end in a /
		if (this.config.url.endsWith("/")) {
			this.config.url = this.config.url.substring(
				0,
				this.config.url.length - 1,
			);
		}

		// If it ends at chat/completions, we trust the URL as is
		if (this.config.url.endsWith("chat/completions")) {
			return;
		}

		// If it ends with /v1, we append just /chat/completions
		if (this.config.url.endsWith("/v1")) {
			this.config.url += "/chat/completions";
		} else {
			this.config.url += "/v1/chat/completions";
		}
	}

	private convertRequestBody(
		req: FireChatCompletionRequest,
	): GenericOAIRequest {
		return {
			model: this.config.modelName,
			messages: req.messages,
			stream: req.stream || false,
			max_tokens: req.max_completion_tokens,
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

	async doRequest(
		req: FireChatCompletionRequest,
		ctx: RequestContext,
	): Promise<FireChatCompletionResponse> {
		const key = this.keyProvider.provide();

		const response = await fetch(this.config.url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${key}`,
			},
			body: JSON.stringify(this.convertRequestBody(req)),
			signal: ctx.signal,
		});

		if (!response.ok) {
			ctx.logger.error(
				`OAI response status: ${response.statusText}`,
			);
			ctx.logger.error(
				`OAI response body: ${await response.text()}`,
			);
			throw new Error("Error performing request!");
		}

		return GenericOAIResponseSchema.parse(await response.json());
	}

	async *doStreamingRequest(
		req: FireChatCompletionRequest,
		ctx: RequestContext,
	): FireChatCompletionStreamingResponse {
		const key = this.keyProvider.provide();

		const response = await fetch(this.config.url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${key}`,
			},
			body: JSON.stringify(this.convertRequestBody(req)),
			signal: ctx.signal,
		});

		if (!response.ok || !response.body) {
			ctx.logger.error(
				`GenericOAI response status: ${response.statusText}`,
			);
			ctx.logger.error(
				`GenericOAI response body: ${await response.text()}`,
			);
			throw new Error("Error performing request!");
		}

		const pipe = response.body
			.pipeThrough(new TextDecoderStream())
			.pipeThrough(new EventSourceParserStream());

		for await (const event of pipe) {
			if (event.data.trim() === "[DONE]") {
				continue;
			}

			const data: unknown = JSON.parse(event.data);
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
	}

	addKeyProvider(keyProvider: KeyProvider) {
		this.keyProvider.addKeyProvider(keyProvider);
	}
}
