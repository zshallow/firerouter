import { ModelProvider } from "../interfaces/model-provider.js";
import { z } from "zod/v4";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response.js";
import { coercedMap } from "../utils/coerced-map.js";
import {
	normalizeWeightedOptions,
	selectRandomOption,
	WeightedOption,
} from "../utils/random-selection-with-weights.js";

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
			throw "Please define either the modelList array or the modelWeights map.";
		}
	}

	doRequest(
		req: FireChatCompletionRequest,
	): Promise<FireChatCompletionResponse> {
		for (let i = 0; i < 100; i++) {
			if (i > 100) {
				throw "Failed to select an existing random model!";
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

			return modelProvider.doRequest(req);
		}

		throw `Failed to find any valid model provider!`;
	}

	doStreamingRequest(
		req: FireChatCompletionRequest,
	): FireChatCompletionStreamingResponse {
		for (let i = 0; i < 100; i++) {
			if (i > 100) {
				throw "Failed to select an existing random model!";
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

			return modelProvider.doStreamingRequest(req);
		}

		throw `Failed to find any valid model provider!`;
	}
}

export const RandomModelProviderConfigurationSchema = z.object({
	type: z.literal("random"),
	modelList: z.array(z.string()).optional(),
	modelWeights: coercedMap(z.string(), z.number()).optional(),
});

type RandomModelProviderConfiguration = z.infer<
	typeof RandomModelProviderConfigurationSchema
>;
