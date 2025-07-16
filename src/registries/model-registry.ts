import {
	GeminiModelProviderConfiguration,
	GenericOAIModelProviderConfiguration,
	ModelProviderConfiguration,
	RandomModelProviderConfiguration,
	TextCompModelProviderConfiguration,
	TrivialModelProviderConfiguration,
} from "../config.js";
import { TrivialModel } from "../models/trivial-model.js";
import { GenericOAIModel } from "../models/generic-oai-model.js";
import { RandomModelProvider } from "../models/random-model-provider.js";
import { Model } from "../interfaces/model.js";
import { GeminiModel } from "../models/gemini-model.js";
import { processorRegistry } from "./processor-registry.js";
import { keyProviderRegistry } from "./key-provider-registry.js";
import nunjucks from "nunjucks";
import { TextCompModel } from "../models/textcomp-model.js";

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
					conf.useMistralPrefix,
					conf.useMoonshotPartial,
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

	private registerTextCompModels(
		name: string,
		conf: TextCompModelProviderConfiguration,
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

		const compiledTemplate = nunjucks.compile(
			conf.template,
			nunjucks.configure({
				autoescape: false,
			}),
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
				new TextCompModel(
					keyProvider,
					processor,
					url,
					modelConf.name,
					compiledTemplate,
					conf.extraStopStrings,
					conf.processOutputWhitespace,
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
			case "textcomp": {
				this.registerTextCompModels(name, conf);
				break;
			}
			case "random": {
				this.registerRandomModel(name, conf);
			}
		}
	}
}

export const modelRegistry = new ModelRegistry();
