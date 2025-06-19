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

		req.messages.splice(this.conf.position, 0, message);

		return req;
	}
}
