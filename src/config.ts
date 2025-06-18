import { z } from "zod/v4";
import { coercedMap } from "./utils/coerced-map.js";

/**
 * KeyProvider configuration
 */

const SimpleEnvironmentKeyProviderConfigurationSchema = z.strictObject({
	type: z.literal("environment"),
	modelTargets: z.array(z.string()),
	envVar: z.string(),
});

export type SimpleEnvironmentKeyProviderConfiguration = z.infer<
	typeof SimpleEnvironmentKeyProviderConfigurationSchema
>;

const SimpleLiteralKeyProviderConfigurationSchema = z.strictObject({
	type: z.literal("literal"),
	modelTargets: z.array(z.string()),
	key: z.string(),
});

export type SimpleLiteralKeyProviderConfiguration = z.infer<
	typeof SimpleLiteralKeyProviderConfigurationSchema
>;

const KeyProviderConfigurationSchema = z.discriminatedUnion("type", [
	SimpleLiteralKeyProviderConfigurationSchema,
	SimpleEnvironmentKeyProviderConfigurationSchema,
]);

export type KeyProviderConfiguration = z.infer<
	typeof KeyProviderConfigurationSchema
>;

/**
 * ModelProvider configuration
 */

const BaseModelProviderConfigurationSchema = z.strictObject({
	processorChain: z.string().optional(),
});

const GenericOAIModelProviderConfigurationSchema =
	BaseModelProviderConfigurationSchema.extend({
		type: z.literal("genericoai"),
		url: z.string(),
		modelName: z.string(),
	});

export type GenericOAIModelProviderConfiguration = z.infer<
	typeof GenericOAIModelProviderConfigurationSchema
>;

const OpenRouterModelProviderConfigurationSchema =
	BaseModelProviderConfigurationSchema.extend({
		type: z.literal("openrouter"),
		modelName: z.string(),
	});

export type OpenRouterModelProviderConfiguration = z.infer<
	typeof OpenRouterModelProviderConfigurationSchema
>;

const GeminiModelProviderConfigurationSchema =
	BaseModelProviderConfigurationSchema.extend({
		type: z.literal("gemini"),
		url: z
			.string()
			.default(
				"https://generativelanguage.googleapis.com/v1beta/models",
			),
		modelName: z.string(),
	});

export type GeminiModelProviderConfiguration = z.infer<
	typeof GeminiModelProviderConfigurationSchema
>;

const RandomModelProviderConfigurationSchema =
	BaseModelProviderConfigurationSchema.extend({
		type: z.literal("random"),
		modelList: z.array(z.string()).optional(),
		modelWeights: coercedMap(z.string(), z.number()).optional(),
	});

export type RandomModelProviderConfiguration = z.infer<
	typeof RandomModelProviderConfigurationSchema
>;

const TrivialModelProviderConfigurationSchema =
	BaseModelProviderConfigurationSchema.extend({
		type: z.literal("trivial"),
		output: z
			.string()
			.default(
				"Yahallo! Some extra padding to make this longer lol.",
			),
	});

export type TrivialModelProviderConfiguration = z.infer<
	typeof TrivialModelProviderConfigurationSchema
>;

const ModelProviderConfigurationSchema = z.discriminatedUnion("type", [
	TrivialModelProviderConfigurationSchema,
	GenericOAIModelProviderConfigurationSchema,
	OpenRouterModelProviderConfigurationSchema,
	RandomModelProviderConfigurationSchema,
	GeminiModelProviderConfigurationSchema,
]);

export type ModelProviderConfiguration = z.infer<
	typeof ModelProviderConfigurationSchema
>;

/**
 * ProcessorChain configuration
 */

const NoDanglingSysProcessorConfigurationSchema = z.strictObject({
	type: z.literal("nodanglingsys"),
});

const NoSysProcessorConfigurationSchema = z.strictObject({
	type: z.literal("nosys"),
});

const OverrideSamplersProcessorConfigurationSchema = z.strictObject({
	type: z.literal("overridesamplers"),
	temperature: z.union([z.number(), z.literal("unset")]).optional(),
	topP: z.union([z.number(), z.literal("unset")]).optional(),
	topK: z.union([z.number(), z.literal("unset")]).optional(),
	topA: z.union([z.number(), z.literal("unset")]).optional(),
	minP: z.union([z.number(), z.literal("unset")]).optional(),
	frequencyPenalty: z.union([z.number(), z.literal("unset")]).optional(),
	repetitionPenalty: z.union([z.number(), z.literal("unset")]).optional(),
	presencePenalty: z.union([z.number(), z.literal("unset")]).optional(),
});

export type OverrideSamplersProcessorConfiguration = z.infer<
	typeof OverrideSamplersProcessorConfigurationSchema
>;

const RegexProcessorConfigurationSchema = z.strictObject({
	type: z.literal("regex"),
	pattern: z.string(),
	flags: z.string().optional(),
	replacement: z.string(),
});

export type RegexProcessorConfiguration = z.infer<
	typeof RegexProcessorConfigurationSchema
>;

const ProcessorConfigurationSchema = z.discriminatedUnion("type", [
	NoDanglingSysProcessorConfigurationSchema,
	NoSysProcessorConfigurationSchema,
	OverrideSamplersProcessorConfigurationSchema,
	RegexProcessorConfigurationSchema,
]);

export type ProcessorConfiguration = z.infer<
	typeof ProcessorConfigurationSchema
>;

const ProcessorChainConfigurationSchema = z.array(ProcessorConfigurationSchema);

/**
 * Whole app configuration
 */

export const ConfigSchema = z.strictObject({
	port: z.number().default(3001),
	keyProviders: coercedMap(z.string(), KeyProviderConfigurationSchema),
	modelProviders: coercedMap(
		z.string(),
		ModelProviderConfigurationSchema,
	),
	processorChains: coercedMap(
		z.string(),
		ProcessorChainConfigurationSchema,
	).default(new Map()),
});
