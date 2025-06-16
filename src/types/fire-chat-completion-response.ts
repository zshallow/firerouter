export type FireChatCompletionResponse = {
	choices?: FireChatCompletionResponseChoice[];
	created?: number;
	id?: string;
	model?: string;
	system_fingerprint?: string;
};

type FireChatCompletionResponseChoice = {
	finish_reason?: string;
	index?: number;
	message?: FireChatCompletionResponseMessage;
};

type FireChatCompletionResponseMessage = {
	content?: string;
	refusal?: string;
	role?: string;
};
