import { FireChatCompletionRequest } from "../types/fire-chat-completion-request";

export interface Processor {
	process(req: FireChatCompletionRequest): FireChatCompletionRequest;
}
