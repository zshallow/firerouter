import { ModelProvider } from "../interfaces/model-provider.js";
import { z } from "zod/v4";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response";
import { EventSourceParserStream } from "eventsource-parser/stream";

type OpenRouterRequestContentTextPart = {
	type: "text";
	text: string;
};

type OpenRouterRequestContentPart = OpenRouterRequestContentTextPart;

type OpenRouterRequestContent = string | OpenRouterRequestContentPart[];

type OpenRouterRequestMessage = {
	role: "system" | "developer" | "user" | "assistant" | "tool";
	content: OpenRouterRequestContent;
};

type OpenRouterRequest = {
	model: string;
	messages: OpenRouterRequestMessage[];
	stream: boolean;
	max_tokens?: number;
	seed?: number;

	temperature?: number;
	top_p?: number;
	top_k?: number;
	frequency_penalty?: number;
	presence_penalty?: number;
	repetition_penalty?: number;
	min_p?: number;
	top_a?: number;
};

const OpenRouterResponseMessageSchema = z.looseObject({
	role: z.string().optional(),
	content: z.string().optional(),
});

const OpenRouterResponseChoiceSchema = z.looseObject({
	message: OpenRouterResponseMessageSchema.optional(),
});

const OpenRouterResponseSchema = z.looseObject({
	choices: z.array(OpenRouterResponseChoiceSchema).optional(),
});

const OpenRouterStreamingResponseDeltaSchema = z.looseObject({
	role: z.string().optional(),
	content: z.string().optional(),
});

const OpenRouterStreamingResponseChoiceSchema = z.looseObject({
	index: z.number(),
	delta: OpenRouterStreamingResponseDeltaSchema.optional(),
});

const OpenRouterStreamingResponseChunkSchema = z.looseObject({
	object: z.literal("chat.completion.chunk"),
	choices: z.array(OpenRouterStreamingResponseChoiceSchema).optional(),
});

export class OpenrouterModelProvider implements ModelProvider {
	keyProvider: KeyProvider;
	config: OpenRouterModelProviderConfiguration;

	constructor(
		keyProvider: KeyProvider,
		config: OpenRouterModelProviderConfiguration,
	) {
		console.log("Initializing a new OpenRouter model provider!");
		this.keyProvider = keyProvider;
		this.config = config;
	}

	private convertRequestBody(
		req: FireChatCompletionRequest,
	): OpenRouterRequest {
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
	): Promise<FireChatCompletionResponse> {
		const key = this.keyProvider.provide();

		const response = await fetch(
			"https://openrouter.ai/api/v1/chat/completions",
			{
				method: "POST",
				headers: {
					ContentType: "application/json",
					Authorization: `Bearer ${key}`,
				},
				body: JSON.stringify(
					this.convertRequestBody(req),
				),
			},
		);

		if (!response.ok) {
			console.error(
				`OpenRouter response status: ${response.status}`,
			);
			console.error(
				`OpenRouter response body: ${await response.text()}`,
			);
			throw "Error performing request!";
		}

		const rawResponseBody = await response.json();
		return OpenRouterResponseSchema.parse(rawResponseBody);
	}

	async *doStreamingRequest(
		req: FireChatCompletionRequest,
	): FireChatCompletionStreamingResponse {
		const key = this.keyProvider.provide();

		console.debug(
			`Sending out request ${JSON.stringify(this.convertRequestBody(req), null, 4)}`,
		);

		const response = await fetch(
			"https://openrouter.ai/api/v1/chat/completions",
			{
				method: "POST",
				headers: {
					ContentType: "application/json",
					Authorization: `Bearer ${key}`,
				},
				body: JSON.stringify(
					this.convertRequestBody(req),
				),
			},
		);

		if (!response.ok || !response.body) {
			console.error(
				`OpenRouter response status: ${response.status}`,
			);
			console.error(
				`OpenRouter response body: ${await response.text()}`,
			);
			throw "Error performing request!";
		}

		const pipe = response.body
			.pipeThrough(new TextDecoderStream())
			.pipeThrough(new EventSourceParserStream());

		for await (const event of pipe) {
			if (event.data.trim() === "[DONE]") {
				continue;
			}

			const data = JSON.parse(event.data);
			const chunkParse =
				OpenRouterStreamingResponseChunkSchema.safeParse(
					data,
				);
			if (!chunkParse.success) {
				console.log(
					`Got chunk ${JSON.stringify(data)}`,
				);
				continue;
			}

			const chunk = chunkParse.data;
			yield chunk;
		}
	}
}

export const OpenRouterModelProviderConfigurationSchema = z.object({
	type: z.literal("openrouter"),
	modelName: z.string(),
	keyProvider: z.string(),
});

type OpenRouterModelProviderConfiguration = z.infer<
	typeof OpenRouterModelProviderConfigurationSchema
>;
