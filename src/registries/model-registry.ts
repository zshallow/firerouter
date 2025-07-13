import {
	GeminiModelProviderConfiguration,
	GenericOAIModelProviderConfiguration,
	ModelProviderConfiguration,
	RandomModelProviderConfiguration,
	TrivialModelProviderConfiguration,
} from "../config.js";
import { TrivialModel } from "../models/trivial-model.js";
import { GenericOAIModel } from "../models/generic-oai-model.js";
import { RandomModelProvider } from "../models/random-model-provider.js";
import { Model } from "../interfaces/model.js";
import { GeminiModel } from "../models/gemini-model.js";
import { processorRegistry } from "./processor-registry.js";
import { keyProviderRegistry } from "./key-provider-registry.js";

class ModelRegistry {
	public models: Map<string, Model>;

	constructor() {
		this.models = new Map();
	}

	private registerTrivialModel(
		name: string,
		conf: TrivialModelProviderConfiguration,
	): void {
		const model = new TrivialModel(conf);
		this.models.set(name, model);
	}

	private registerGenericOaiModels(
		name: string,
		conf: GenericOAIModelProviderConfiguration,
	): void {
		let url = conf.url;
		// Ensure the URL doesn't end in a /
		if (url.endsWith("/")) {
			url = url.substring(0, url.length - 1);
		}

		// If it ends with /v1, we append just /chat/completions
		if (!url.endsWith("/v1")) {
			url += "/v1";
		}

		const keyProvider = keyProviderRegistry.getKeyProvider(
			conf.keyProvider,
		);

		for (const [modelName, modelConf] of conf.models) {
			let processor = undefined;
			if (modelConf.processor) {
				processor = processorRegistry.getProcessor(
					modelConf.processor,
				);
			}

			const modelId = `${name}/${modelName}`;
			if (this.models.has(modelId)) {
				throw new Error(
					`Name collision with ${modelId}!`,
				);
			}

			this.models.set(
				modelId,
				new GenericOAIModel(
					keyProvider,
					processor,
					url,
					modelConf.name,
				),
			);
		}
	}

	private registerGeminiModels(
		name: string,
		conf: GeminiModelProviderConfiguration,
	): void {
		let url = conf.url;

		if (url.endsWith("/")) {
			url = url.substring(0, url.length - 1);
		}

		if (url.toLowerCase().endsWith("v1beta")) {
			url += "/models";
		} else if (!url.toLowerCase().endsWith("v1beta/models")) {
			url += "/v1beta/models";
		}

		const keyProvider = keyProviderRegistry.getKeyProvider(
			conf.keyProvider,
		);

		for (const [modelName, modelConf] of conf.models) {
			let processor = undefined;
			if (modelConf.processor) {
				processor = processorRegistry.getProcessor(
					modelConf.processor,
				);
			}

			const modelId = `${name}/${modelName}`;
			if (this.models.has(modelId)) {
				throw new Error(
					`ModelID ${modelId} already taken!`,
				);
			}

			this.models.set(
				modelId,
				new GeminiModel(
					keyProvider,
					processor,
					url,
					modelConf.name,
				),
			);
		}
	}

	private registerRandomModel(
		name: string,
		conf: RandomModelProviderConfiguration,
	): void {
		this.models.set(
			name,
			new RandomModelProvider(this.models, conf),
		);
	}

	registerModels(name: string, conf: ModelProviderConfiguration): void {
		switch (conf.type) {
			case "trivial": {
				this.registerTrivialModel(name, conf);
				break;
			}
			case "genericoai": {
				this.registerGenericOaiModels(name, conf);
				break;
			}
			case "gemini": {
				this.registerGeminiModels(name, conf);
				break;
			}
			case "random": {
				this.registerRandomModel(name, conf);
			}
		}
	}
}

export const modelRegistry = new ModelRegistry();
