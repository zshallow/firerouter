import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response";
import { FireChatCompletionStreamingResponse } from "../types/fire-chat-completion-streaming-response";
import { RequestContext } from "../types/request-context";

export interface Model {
	doRequest(
		req: FireChatCompletionRequest,
		ctx: RequestContext,
	): Promise<FireChatCompletionResponse>;
	doStreamingRequest(
		req: FireChatCompletionRequest,
		ctx: RequestContext,
	): FireChatCompletionStreamingResponse;
}
