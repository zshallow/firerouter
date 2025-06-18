import { Processor } from "../interfaces/processor";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request";

export class NoSysProcessor implements Processor {
	process(req: FireChatCompletionRequest): FireChatCompletionRequest {
		for (const m of req.messages) {
			if (["developer", "system"].includes(m.role)) {
				m.role = "user";
			}
		}

		return req;
	}
}
