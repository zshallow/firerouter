import { Processor } from "../interfaces/processor";
import { RegexProcessorConfiguration } from "../config";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request";

export class RegexProcessor implements Processor {
	regex: RegExp;
	replacement: string;

	constructor(conf: RegexProcessorConfiguration) {
		this.regex = new RegExp(conf.pattern, conf.flags);
		this.replacement = conf.replacement;
	}

	process(req: FireChatCompletionRequest): FireChatCompletionRequest {
		for (const m of req.messages) {
			if (typeof m.content === "string") {
				m.content = m.content.replace(
					this.regex,
					this.replacement,
				);
			} else {
				m.content.forEach((part) => {
					part.text = part.text.replace(
						this.regex,
						this.replacement,
					);
				});
			}
		}

		return req;
	}
}
