import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response";

export interface ModelProvider {
	doRequest(
		req: FireChatCompletionRequest,
	): Promise<FireChatCompletionResponse>;
	doStreamingRequest(
		req: FireChatCompletionRequest,
	): FireChatCompletionStreamingResponse;
}
