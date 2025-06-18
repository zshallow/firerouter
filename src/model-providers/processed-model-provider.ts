import { ModelProvider } from "../interfaces/model-provider";
import { Processor } from "../interfaces/processor";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response";
import { FireChatCompletionStreamingResponse } from "../types/fire-chat-completion-streaming-response";
import { KeyProvider } from "../interfaces/key-provider";

export class ProcessedModelProvider implements ModelProvider {
	nested: ModelProvider;
	processor: Processor;

	constructor(nested: ModelProvider, processor: Processor) {
		this.nested = nested;
		this.processor = processor;
	}

	doRequest(
		req: FireChatCompletionRequest,
		sgn: AbortSignal,
	): Promise<FireChatCompletionResponse> {
		return this.nested.doRequest(this.processor.process(req), sgn);
	}

	doStreamingRequest(
		req: FireChatCompletionRequest,
		sgn: AbortSignal,
	): FireChatCompletionStreamingResponse {
		return this.nested.doStreamingRequest(
			this.processor.process(req),
			sgn,
		);
	}

	addKeyProvider(keyProvider: KeyProvider) {
		this.nested.addKeyProvider(keyProvider);
	}
}
