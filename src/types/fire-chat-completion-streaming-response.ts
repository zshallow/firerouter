export type FireChatCompletionStreamingResponse =
	AsyncIterable<FireChatCompletionChunk>;

export type FireChatCompletionChunk = {
	id?: string;
	model?: string;
	object: "chat.completion.chunk";
	created?: number;
	choices?: FireChatCompletionChunkChoice[];
	system_fingerprint?: string;
};

type FireChatCompletionChunkChoice = {
	index: number;
	delta?: FireChatCompletionChunkDelta;
	finish_reason?: string;
};

type FireChatCompletionChunkDelta = {
	role?: string;
	content?: string;
};
