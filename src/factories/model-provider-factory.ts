import { ModelProviderConfiguration } from "../config.js";
import { TrivialModelProvider } from "../model-providers/trivial-model-provider.js";
import { GenericOAIModelProvider } from "../model-providers/generic-oai-model-provider.js";
import { OpenRouterModelProvider } from "../model-providers/openrouter-model-provider.js";
import { RandomModelProvider } from "../model-providers/random-model-provider.js";
import { ModelProvider } from "../interfaces/model-provider.js";
import { GeminiModelProvider } from "../model-providers/gemini-model-provider.js";

class ModelProviderFactory {
	makeModelProvider(
		conf: ModelProviderConfiguration,
		extra: {
			modelsProvider: Map<string, ModelProvider>;
		},
	) {
		switch (conf.type) {
			case "trivial": {
				return new TrivialModelProvider(conf);
			}
			case "genericoai": {
				return new GenericOAIModelProvider(conf);
			}
			case "openrouter": {
				return new OpenRouterModelProvider(conf);
			}
			case "gemini": {
				return new GeminiModelProvider(conf);
			}
			case "random": {
				return new RandomModelProvider(
					extra.modelsProvider,
					conf,
				);
			}
		}
	}
}

export const modelProviderFactory = new ModelProviderFactory();
