import { Processor } from "../interfaces/processor.js";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";
import { cleanWhitespace } from "../utils/clean-whitespace.js";

export class WhitespaceProcessor implements Processor {
	process(req: FireChatCompletionRequest): FireChatCompletionRequest {
		for (const m of req.messages) {
			if (typeof m.content === "string") {
				m.content = cleanWhitespace(m.content);
			} else
				for (const p of m.content) {
					p.text = cleanWhitespace(p.text);
				}
		}

		return req;
	}
}
