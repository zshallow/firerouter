import { z } from "zod/v4";
import { coercedMap } from "./utils/coerced-map.js";
import { SomeType } from "zod/v4/core";

/**
 * KeyProvider configuration
 */

// Loads key from envvar
const SimpleEnvironmentKeyProviderConfigurationSchema = z.strictObject({
	type: z.literal("environment"),
	modelTargets: z.array(z.string()),
	envVar: z.string(),
});

export type SimpleEnvironmentKeyProviderConfiguration = z.infer<
	typeof SimpleEnvironmentKeyProviderConfigurationSchema
>;

// Loads key from the literal key you just put in the config file
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

// Generic OAI. Use with OAI, llamacpp, etc.
const GenericOAIModelProviderConfigurationSchema =
	BaseModelProviderConfigurationSchema.extend({
		type: z.literal("genericoai"),
		url: z
			.string()
			.default("https://api.openai.com/v1/chat/completions"),
		modelName: z.string(),
	});

export type GenericOAIModelProviderConfiguration = z.infer<
	typeof GenericOAIModelProviderConfigurationSchema
>;

// OpenRouter
const OpenRouterModelProviderConfigurationSchema =
	BaseModelProviderConfigurationSchema.extend({
		type: z.literal("openrouter"),
		modelName: z.string(),
	});

export type OpenRouterModelProviderConfiguration = z.infer<
	typeof OpenRouterModelProviderConfigurationSchema
>;

// Gemini
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

// Trivial model provider that responds with a fixed sentence.
// For testing if your server is accessible.
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

// Ensures there are no system messages after the initial "block."
// That is, once there's a non-system message, every subsequent message
// is changed to user role
const NoDanglingSysProcessorConfigurationSchema = z.strictObject({
	type: z.literal("nodanglingsys"),
});

// Transforms every sys message into an user message.
const NoSysProcessorConfigurationSchema = z.strictObject({
	type: z.literal("nosys"),
});

// Overrides samplers
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

// Runs a regex on every individual message
const RegexProcessorConfigurationSchema = z.strictObject({
	type: z.literal("regex"),
	pattern: z.string(),
	flags: z.string().optional(),
	replacement: z.string(),
});

export type RegexProcessorConfiguration = z.infer<
	typeof RegexProcessorConfigurationSchema
>;

// Runs a nested in random processor
const RandomProcessorConfigurationSchema = z.strictObject({
	type: z.literal("random"),
	processorList: z.array(
		z.lazy((): SomeType => ProcessorConfigurationSchema),
	),
});

export type RandomProcessorConfiguration = z.infer<
	typeof RandomProcessorConfigurationSchema
>;

const ProcessorConfigurationSchema = z.discriminatedUnion("type", [
	NoDanglingSysProcessorConfigurationSchema,
	NoSysProcessorConfigurationSchema,
	OverrideSamplersProcessorConfigurationSchema,
	RegexProcessorConfigurationSchema,
	RandomProcessorConfigurationSchema,
]);

export type ProcessorConfiguration = z.infer<
	typeof ProcessorConfigurationSchema
>;

const ProcessorChainConfigurationSchema = z.array(ProcessorConfigurationSchema);

/**
 * Whole app configuration
 */

export const ConfigSchema = z.strictObject({
	port: z.number().default(3000),
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
