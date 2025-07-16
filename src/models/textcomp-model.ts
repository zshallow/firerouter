import { Model } from "../interfaces/model.js";
import { KeyProvider } from "../interfaces/key-provider.js";
import { Processor } from "../interfaces/processor.js";
import nunjucks from "nunjucks";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";
import {
	TextCompRequest,
	TextCompResponseSchema,
	TextCompStreamingResponseChunkSchema,
} from "../types/textcomp-types.js";
import { RequestContext } from "../types/request-context.js";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response.js";
import YAML from "yaml";
import { FireChatCompletionStreamingResponse } from "../types/fire-chat-completion-streaming-response.js";
import { EventSourceParserStream } from "eventsource-parser/stream";
import { cleanWhitespace } from "../utils/clean-whitespace.js";

export class TextCompModel implements Model {
	keyProvider: KeyProvider;
	processor: Processor | undefined;
	modelName: string;
	url: string;
	template: nunjucks.Template;
	extraStopStrings: string[];
	processOutputWhitespace: boolean;

	constructor(
		keyProvider: KeyProvider,
		processor: Processor | undefined,
		url: string,
		modelName: string,
		template: nunjucks.Template,
		extraStopStrings: string[],
		processOutputWhitespace: boolean,
	) {
		console.log("Initializing a new text comp model provider!");

		this.keyProvider = keyProvider;
		this.processor = processor;
		this.url = url;
		this.modelName = modelName;
		this.extraStopStrings = extraStopStrings;
		this.processOutputWhitespace = processOutputWhitespace;

		this.template = template;
	}

	private convertRequestBody(
		req: FireChatCompletionRequest,
	): TextCompRequest {
		const reqStopStrings = [];
		if (typeof req.stop === "string") {
			reqStopStrings.push(req.stop);
		} else if (Array.isArray(req.stop)) {
			reqStopStrings.push(...req.stop);
		}

		reqStopStrings.push(...this.extraStopStrings);

		let prompt = this.template.render(req);
		if (this.processOutputWhitespace) {
			prompt = cleanWhitespace(prompt);
		}

		return {
			model: this.modelName,
			prompt: prompt,
			stream: req.stream || false,
			max_tokens: req.max_tokens ?? req.max_completion_tokens,
			max_completion_tokens:
				req.max_completion_tokens ?? req.max_tokens,
			seed: req.seed,
			stop: reqStopStrings,
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
		}

		const convertedRequestBody = this.convertRequestBody(req);
		console.debug("Converted request body for text comp request!");
		console.debug(YAML.stringify(convertedRequestBody));

		return this.keyProvider.withKey(
			ctx.signal,
			async (
				key: string,
			): Promise<FireChatCompletionResponse> => {
				const response = await fetch(
					`${this.url}/completions`,
					{
						method: "POST",
						headers: {
							"Content-Type":
								"application/json",
							Authorization: `Bearer ${key}`,
						},
						body: JSON.stringify(
							convertedRequestBody,
						),
						signal: ctx.signal,
					},
				);

				if (!response.ok) {
					ctx.logger.error(
						`Text comp response status: ${response.statusText}`,
					);
					ctx.logger.error(
						`Text comp response body: ${await response.text()}`,
					);
					throw new Error(
						"Error performing request!",
					);
				}

				return TextCompResponseSchema.parse(
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
		}

		const convertedRequestBody = this.convertRequestBody(req);
		console.debug("Converted request body for text comp request!");
		console.debug(YAML.stringify(convertedRequestBody));

		const _this = this;
		return this.keyProvider.withKey(
			ctx.signal,
			async function* (
				key: string,
			): FireChatCompletionStreamingResponse {
				const response = await fetch(
					`${_this.url}/completions`,
					{
						method: "POST",
						headers: {
							"Content-Type":
								"application/json",
							Authorization: `Bearer ${key}`,
						},
						body: JSON.stringify(
							convertedRequestBody,
						),
						signal: ctx.signal,
					},
				);

				if (!response.ok || !response.body) {
					ctx.logger.error(
						`Text comp response status: ${response.statusText}`,
					);
					ctx.logger.error(
						`Text comp response body: ${await response.text()}`,
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
						TextCompStreamingResponseChunkSchema.safeParse(
							data,
						);
					if (!chunkParse.success) {
						ctx.logger.debug(
							`Got chunk ${JSON.stringify(data)}`,
						);
						continue;
					}

					const chunk = chunkParse.data;
					if (
						chunk.choices === undefined ||
						chunk.choices.length === 0
					) {
						continue;
					}

					yield {
						object: "chat.completion.chunk",
						choices: chunk.choices.map(
							(choice) => {
								return {
									index: 0,
									delta: {
										role: "assistant",
										content: choice.text,
									},
								};
							},
						),
					};
				}
			},
		);
	}
}
