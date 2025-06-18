import { ModelProvider } from "../interfaces/model-provider.js";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response";
import { FireChatCompletionStreamingResponse } from "../types/fire-chat-completion-streaming-response";
import { TrivialModelProviderConfiguration } from "../config.js";

export class TrivialModelProvider implements ModelProvider {
	output: string;

	doRequest(): Promise<FireChatCompletionResponse> {
		return Promise.resolve({
			choices: [
				{
					index: 0,
					message: {
						content: this.output,
						role: "assistant",
					},
				},
			],
			model: "trivial",
		});
	}

	async *doStreamingRequest(): FireChatCompletionStreamingResponse {
		for (const char of this.output) {
			yield {
				model: "trivial",
				object: "chat.completion.chunk",
				choices: [
					{
						index: 0,
						delta: {
							role: "assistant",
							content: char,
						},
					},
				],
			};

			await new Promise((resolve) =>
				setTimeout(resolve, 500),
			);
		}
	}

	constructor(config: TrivialModelProviderConfiguration) {
		console.log("Initializing a new trivial model provider!");
		this.output = config.output;
	}

	addKeyProvider() {}
}
