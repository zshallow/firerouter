/**
 * Funny supporting types.
 */
import { z } from "zod/v4";

export type GeminiRequestPart = {
	thought?: boolean;
	text: string;
};

export type GeminiRequestContent = {
	role?: "user" | "model";
	parts: GeminiRequestPart[];
};

type GeminiRequestSafetySettings = {
	category:
		| "HARM_CATEGORY_HARASSMENT"
		| "HARM_CATEGORY_HATE_SPEECH"
		| "HARM_CATEGORY_SEXUALLY_EXPLICIT"
		| "HARM_CATEGORY_DANGEROUS_CONTENT"
		| "HARM_CATEGORY_CIVIC_INTEGRITY";
	threshold: "OFF";
};

type GeminiRequestGenerationConfig = {
	stopSequences?: string[];
	maxOutputTokens?: number;
	temperature?: number;
	topP?: number;
	topK?: number;
	presencePenalty?: number;
	frequencyPenalty?: number;
};

export type GeminiRequest = {
	contents: GeminiRequestContent[];
	safetySettings: GeminiRequestSafetySettings[];
	systemInstruction?: GeminiRequestContent;
	generationConfig?: GeminiRequestGenerationConfig;
};

const GeminiResponsePartsSchema = z.looseObject({
	text: z.string(),
});

const GeminiResponseContentSchema = z.looseObject({
	parts: z.array(GeminiResponsePartsSchema),
	role: z.literal("model"),
});

const GeminiResponseCandidateSchema = z.looseObject({
	content: GeminiResponseContentSchema,
});

export const GeminiResponseSchema = z.looseObject({
	candidates: z.array(GeminiResponseCandidateSchema),
});

const GeminiStreamingResponsePartSchema = z.looseObject({
	text: z.string(),
});

const GeminiStreamingResponseContentSchema = z.looseObject({
	role: z.literal("model"),
	parts: z.array(GeminiStreamingResponsePartSchema),
});

const GeminiStreamingResponseCandidateSchema = z.looseObject({
	content: GeminiStreamingResponseContentSchema,
});

export const GeminiStreamingResponseChunkSchema = z.looseObject({
	candidates: z.array(GeminiStreamingResponseCandidateSchema),
	modelVersion: z.string(),
	responseId: z.string(),
});
