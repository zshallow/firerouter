import { Processor } from "../interfaces/processor";
import { InsertMessageProcessorConfiguration } from "../config";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request";

export class InsertMessageProcessor implements Processor {
	conf: InsertMessageProcessorConfiguration;

	constructor(conf: InsertMessageProcessorConfiguration) {
		this.conf = conf;
	}

	process(req: FireChatCompletionRequest) {
		const message = {
			role: this.conf.role,
			content: this.conf.content,
		};

		let position = this.conf.position;
		if (position < 0) {
			position = req.messages.length + position + 1;
		}

		req.messages = req.messages
			.slice(0, position)
			.concat(message, ...req.messages.slice(position));

		return req;
	}
}
