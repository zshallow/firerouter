import { z } from "zod/v4";

/**
 * Funny supporting types.
 */
type GenericOAIRequestContentTextPart = {
	type: "text";
	text: string;
};
type GenericOAIRequestContentPart = GenericOAIRequestContentTextPart;
type GenericOAIRequestContent = string | GenericOAIRequestContentPart[];
export type GenericOAIRequestMessage = {
	role: "system" | "developer" | "user" | "assistant" | "tool";
	content: GenericOAIRequestContent;
	prefix?: true;
	partial?: true;
};
export type GenericOAIRequest = {
	model: string;
	messages: GenericOAIRequestMessage[];
	stream: boolean;
	max_tokens?: number;
	max_completion_tokens?: number;
	seed?: number;
	stop?: string | string[];

	temperature?: number;
	top_p?: number;
	top_k?: number;
	frequency_penalty?: number;
	presence_penalty?: number;
	repetition_penalty?: number;
	min_p?: number;
	top_a?: number;
};
const GenericOAIResponseMessageSchema = z.looseObject({
	role: z.string().optional(),
	content: z.string().optional(),
});
const GenericOAIResponseChoiceSchema = z.looseObject({
	message: GenericOAIResponseMessageSchema.optional(),
});
export const GenericOAIResponseSchema = z.looseObject({
	choices: z.array(GenericOAIResponseChoiceSchema).optional(),
});
const GenericOAIStreamingResponseDeltaSchema = z.looseObject({
	role: z.string().optional(),
	content: z.string().optional(),
});
const GenericOAIStreamingResponseChoiceSchema = z.looseObject({
	index: z.number(),
	delta: GenericOAIStreamingResponseDeltaSchema.optional(),
});
export const GenericOAIStreamingResponseChunkSchema = z.looseObject({
	object: z.literal("chat.completion.chunk"),
	choices: z.array(GenericOAIStreamingResponseChoiceSchema).optional(),
});

export const GenericOAIModelListSchema = z.looseObject({
	data: z.array(
		z.looseObject({
			id: z.string(),
		}),
	),
});
