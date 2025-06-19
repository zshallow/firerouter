import { Processor } from "../interfaces/processor.js";
import { SquashProcessorConfiguration } from "../config.js";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";
import { chunkByLevel } from "../utils/chunk-by-level.js";

export class SquashProcessor implements Processor {
	conf: SquashProcessorConfiguration;

	constructor(conf: SquashProcessorConfiguration) {
		this.conf = conf;
	}

	process(req: FireChatCompletionRequest): FireChatCompletionRequest {
		const chunked = chunkByLevel(req.messages, (m) => m.role);
		const squashedMessages = [];

		for (const chunk of chunked) {
			if (this.conf.roles.includes(chunk[0].role)) {
				squashedMessages.push({
					role: chunk[0].role,
					content: chunk
						.flatMap((m) =>
							typeof m.content ===
							"string"
								? [m.content]
								: m.content.map(
										(
											p,
										) =>
											p.text,
									),
						)
						.join(this.conf.squashString),
				});
			} else {
				squashedMessages.push(...chunk);
			}
		}

		req.messages = squashedMessages;

		return req;
	}
}
