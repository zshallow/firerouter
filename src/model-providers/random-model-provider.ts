import { ModelProvider } from "../interfaces/model-provider.js";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response.js";
import {
	normalizeWeightedOptions,
	selectRandomOption,
	WeightedOption,
} from "../utils/random-selection-with-weights.js";
import { FireChatCompletionStreamingResponse } from "../types/fire-chat-completion-streaming-response";
import { RandomModelProviderConfiguration } from "../config.js";

export class RandomModelProvider implements ModelProvider {
	modelsProvider: Map<string, ModelProvider>;
	weightedModels: WeightedOption<string>[];

	constructor(
		modelsProvider: Map<string, ModelProvider>,
		config: RandomModelProviderConfiguration,
	) {
		this.modelsProvider = modelsProvider;

		if (config.modelWeights) {
			this.weightedModels = normalizeWeightedOptions(
				Array.from(config.modelWeights.entries()),
			);
		} else if (config.modelList) {
			this.weightedModels = normalizeWeightedOptions(
				config.modelList.map((model) => [model, 1]),
			);
		} else {
			throw new Error(
				"Please define either the modelList array or the modelWeights map.",
			);
		}
	}

	doRequest(
		req: FireChatCompletionRequest,
		sgn: AbortSignal,
	): Promise<FireChatCompletionResponse> {
		for (let i = 0; i < 100; i++) {
			const modelName = selectRandomOption(
				this.weightedModels,
			);
			const modelProvider =
				this.modelsProvider.get(modelName);
			if (!modelProvider) {
				console.error(
					`Failed to find model provider ${modelName}. Trying again.`,
				);
				continue;
			}

			return modelProvider.doRequest(req, sgn);
		}

		throw new Error("Failed to find any valid model provider!");
	}

	doStreamingRequest(
		req: FireChatCompletionRequest,
		sgn: AbortSignal,
	): FireChatCompletionStreamingResponse {
		for (let i = 0; i < 100; i++) {
			if (i > 100) {
				throw new Error(
					"Failed to select an existing random model!",
				);
			}

			const modelName = selectRandomOption(
				this.weightedModels,
			);
			const modelProvider =
				this.modelsProvider.get(modelName);
			if (!modelProvider) {
				console.error(
					`Failed to find model provider ${modelName}. Trying again.`,
				);
				continue;
			}

			return modelProvider.doStreamingRequest(req, sgn);
		}

		throw new Error("Failed to find any valid model provider!");
	}

	addKeyProvider() {}
}
