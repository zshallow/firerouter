import { Processor } from "../interfaces/processor";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request";

export class ChainProcessor implements Processor {
	nested: Processor[];

	constructor(nested: Processor[]) {
		this.nested = nested;
	}

	process(req: FireChatCompletionRequest): FireChatCompletionRequest {
		for (const p of this.nested) {
			req = p.process(req);
		}

		return req;
	}
}
