import { Processor } from "../interfaces/processor";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request";
import { NoassProcessorConfiguration } from "../config";

export class NoassProcessor implements Processor {
	conf: NoassProcessorConfiguration;

	constructor(conf: NoassProcessorConfiguration) {
		this.conf = conf;
	}

	process(req: FireChatCompletionRequest): FireChatCompletionRequest {
		let seenFirstAssistantMessage = false;

		for (const m of req.messages) {
			if (
				!seenFirstAssistantMessage &&
				m.role !== "assistant"
			) {
				continue;
			}

			seenFirstAssistantMessage = true;
			m.role = this.conf.role;
		}

		return req;
	}
}
