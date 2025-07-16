import { z } from "zod/v4";

/**
 * Funny supporting types.
 */
export type TextCompRequest = {
	model: string;
	prompt: string;
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

const TextCompResponseChoiceSchema = z.looseObject({
	text: z.string().optional(),
	index: z.number().optional(),
	finish_reason: z.string().optional(),
});

export const TextCompResponseSchema = z.looseObject({
	choices: z.array(TextCompResponseChoiceSchema).optional(),
});

const TextCompStreamingResponseChoiceSchema = z.looseObject({
	text: z.string(),
});

export const TextCompStreamingResponseChunkSchema = z.looseObject({
	object: z.literal("chat.completion.chunk"),
	choices: z.array(TextCompStreamingResponseChoiceSchema).optional(),
});
