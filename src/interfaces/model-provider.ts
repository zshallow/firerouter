import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response";
import { KeyProvider } from "./key-provider";
import { FireChatCompletionStreamingResponse } from "../types/fire-chat-completion-streaming-response";

export interface ModelProvider {
	doRequest(
		req: FireChatCompletionRequest,
		sgn: AbortSignal,
	): Promise<FireChatCompletionResponse>;
	doStreamingRequest(
		req: FireChatCompletionRequest,
		sgn: AbortSignal,
	): FireChatCompletionStreamingResponse;
	addKeyProvider(keyProvider: KeyProvider): void;
}
