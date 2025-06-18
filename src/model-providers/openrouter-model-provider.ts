import { GenericOAIModelProvider } from "./generic-oai-provider.js";
import {
	GenericOAIModelProviderConfiguration,
	OpenRouterModelProviderConfiguration,
} from "../config.js";

export class OpenrouterModelProvider extends GenericOAIModelProvider {
	constructor(config: OpenRouterModelProviderConfiguration) {
		console.log("Initializing a new OpenRouter model provider!");
		const oaiConfiguration: GenericOAIModelProviderConfiguration = {
			type: "genericoai",
			url: "https://openrouter.ai/api/v1/chat/completions",
			modelName: config.modelName,
		};

		super(oaiConfiguration);
	}
}
