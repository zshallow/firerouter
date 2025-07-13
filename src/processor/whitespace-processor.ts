import { Processor } from "../interfaces/processor.js";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";

export class WhitespaceProcessor implements Processor {
	private cleanWhitespace(s: string): string {
		return s
			.trim()
			.replaceAll(/\s+/g, function (match: string): string {
				if (
					match.indexOf("\n") !==
					match.lastIndexOf("\n")
				) {
					return "\n\n";
				}

				if (match.includes("\n")) {
					return "\n";
				}

				return " ";
			});
	}

	process(req: FireChatCompletionRequest): FireChatCompletionRequest {
		for (const m of req.messages) {
			if (typeof m.content === "string") {
				m.content = this.cleanWhitespace(m.content);
			} else
				for (const p of m.content) {
					p.text = this.cleanWhitespace(p.text);
				}
		}

		return req;
	}
}
