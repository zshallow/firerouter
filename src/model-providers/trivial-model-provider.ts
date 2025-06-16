import { ModelProvider } from "../interfaces/model-provider.js";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response";
import { z } from "zod/v4";

export class TrivialModelProvider implements ModelProvider {
	output: string;

	async doRequest(): Promise<FireChatCompletionResponse> {
		return {
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
		};
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
}

export const TrivialModelProviderConfigurationSchema = z.object({
	type: z.literal("trivial"),
	output: z
		.string()
		.default(
			"Yahallo! Some extra padding to make this longer lol.",
		),
});

type TrivialModelProviderConfiguration = z.infer<
	typeof TrivialModelProviderConfigurationSchema
>;
