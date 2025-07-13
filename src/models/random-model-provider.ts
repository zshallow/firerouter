import { Model } from "../interfaces/model";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response.js";
import {
	normalizeWeightedOptions,
	selectRandomOption,
	WeightedOption,
} from "../utils/random-selection-with-weights.js";
import { FireChatCompletionStreamingResponse } from "../types/fire-chat-completion-streaming-response";
import { RandomModelProviderConfiguration } from "../config.js";
import { RequestContext } from "../types/request-context";

export class RandomModelProvider implements Model {
	readonly modelsProvider: Map<string, Model>;
	readonly weightedModels: WeightedOption<string>[];
	init: boolean;

	constructor(
		modelsProvider: Map<string, Model>,
		config: RandomModelProviderConfiguration,
	) {
		this.modelsProvider = modelsProvider;
		this.init = false;

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

	private ensureInit(): void {
		for (const [modelName] of this.weightedModels) {
			if (!this.modelsProvider.has(modelName)) {
				throw new Error(
					`RandomProvider error: ModelsProvider cannot provide ${modelName}!`,
				);
			}
		}

		this.init = true;
	}

	private selectRandomModel(): Model {
		if (!this.init) {
			this.ensureInit();
		}

		const modelName = selectRandomOption(this.weightedModels);

		console.debug(`Model ${modelName} selected!`);

		// The ensureInit() method guarantees that any modelName selected will exist
		// in the modelsProvider, so this non-null assertion is safe.
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return this.modelsProvider.get(modelName)!;
	}

	doRequest(
		req: FireChatCompletionRequest,
		ctx: RequestContext,
	): Promise<FireChatCompletionResponse> {
		return this.selectRandomModel().doRequest(req, ctx);
	}

	doStreamingRequest(
		req: FireChatCompletionRequest,
		ctx: RequestContext,
	): FireChatCompletionStreamingResponse {
		return this.selectRandomModel().doStreamingRequest(req, ctx);
	}
}
