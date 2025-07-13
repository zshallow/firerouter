import { z } from "zod/v4";

const FireMessageContentTextPartSchema = z.object({
	type: z.literal("text"),
	text: z.string(),
});

const FireMessageContentPartSchema = z.discriminatedUnion("type", [
	FireMessageContentTextPartSchema,
]);

const FireMessageContentSchema = z.union([
	z.string(),
	z.array(FireMessageContentPartSchema),
]);

const FireDeveloperMessageSchema = z.object({
	content: FireMessageContentSchema,
	role: z.literal("developer"),
	name: z.string().optional(),
});

const FireSystemMessageSchema = z.object({
	content: FireMessageContentSchema,
	role: z.literal("system"),
	name: z.string().optional(),
});

const FireUserMessageSchema = z.object({
	content: FireMessageContentSchema,
	role: z.literal("user"),
	name: z.string().optional(),
});

const FireAssistantMessageSchema = z.object({
	content: FireMessageContentSchema,
	role: z.literal("assistant"),
	name: z.string().optional(),
	refusal: z.string().optional(),
});

const FireMessageSchema = z.discriminatedUnion("role", [
	FireDeveloperMessageSchema,
	FireSystemMessageSchema,
	FireUserMessageSchema,
	FireAssistantMessageSchema,
]);

const FireChatCompletionRequestSchema = z.object({
	messages: z.array(FireMessageSchema),
	model: z.string(),
	logit_bias: z.map(z.string(), z.number()).optional(),
	logprobs: z.boolean().optional(),
	max_tokens: z.int().optional(),
	max_completion_tokens: z.int().optional(),
	seed: z.number().optional(),
	stop: z.union([z.string(), z.array(z.string())]).optional(),
	stream: z.boolean().optional(),
	top_logprobs: z.number().optional(),

	presence_penalty: z.number().optional(),
	frequency_penalty: z.number().optional(),
	repetition_penalty: z.number().optional(),
	min_p: z.number().optional(),
	top_a: z.number().optional(),
	temperature: z.number().optional(),
	top_p: z.number().optional(),
	top_k: z.number().optional(),
});

export type FireChatCompletionRequest = z.infer<
	typeof FireChatCompletionRequestSchema
>;

export { FireChatCompletionRequestSchema };
