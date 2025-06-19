import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response";
import { KeyProvider } from "./key-provider";
import { FireChatCompletionStreamingResponse } from "../types/fire-chat-completion-streaming-response";
import { RequestContext } from "../types/request-context";

export interface ModelProvider {
	doRequest(
		req: FireChatCompletionRequest,
		ctx: RequestContext,
	): Promise<FireChatCompletionResponse>;
	doStreamingRequest(
		req: FireChatCompletionRequest,
		ctx: RequestContext,
	): FireChatCompletionStreamingResponse;
	addKeyProvider(keyProvider: KeyProvider): void;
}
