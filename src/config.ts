import { z } from "zod/v4";
import { SimpleLiteralKeyProviderConfigurationSchema } from "./key-providers/simple-literal-key-provider.js";
import { SimpleEnvironmentKeyProviderConfigurationSchema } from "./key-providers/simple-environment-key-provider.js";
import { TrivialModelProviderConfigurationSchema } from "./model-providers/trivial-model-provider.js";
import { coercedMap } from "./utils/coerced-map.js";
import { OpenRouterModelProviderConfigurationSchema } from "./model-providers/openrouter-model-provider.js";
import { RandomModelProviderConfigurationSchema } from "./model-providers/random-model-provider.js";

const KeyProviderConfigurationSchema = z.discriminatedUnion("type", [
	SimpleLiteralKeyProviderConfigurationSchema,
	SimpleEnvironmentKeyProviderConfigurationSchema,
]);

const ModelProviderConfigurationSchema = z.discriminatedUnion("type", [
	TrivialModelProviderConfigurationSchema,
	OpenRouterModelProviderConfigurationSchema,
	RandomModelProviderConfigurationSchema,
]);

export const ConfigSchema = z.object({
	port: z.number().default(3001),
	keyProviders: coercedMap(z.string(), KeyProviderConfigurationSchema),
	modelProviders: coercedMap(
		z.string(),
		ModelProviderConfigurationSchema,
	),
});
