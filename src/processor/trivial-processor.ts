import { Processor } from "../interfaces/processor";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request";

export class TrivialProcessor implements Processor {
	process(req: FireChatCompletionRequest): FireChatCompletionRequest {
		return req;
	}
}
