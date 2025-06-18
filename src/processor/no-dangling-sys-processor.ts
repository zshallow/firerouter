import { Processor } from "../interfaces/processor";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request";

export class NoDanglingSysProcessor implements Processor {
	process(req: FireChatCompletionRequest): FireChatCompletionRequest {
		let sysPromptOver = false;
		for (const m of req.messages) {
			if (["user", "assistant"].includes(m.role)) {
				sysPromptOver = true;
			} else if (sysPromptOver) {
				m.role = "user";
			}
		}

		return req;
	}
}
