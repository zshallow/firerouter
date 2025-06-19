import { ModelProvider } from "../interfaces/model-provider";
import { Processor } from "../interfaces/processor";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request";
import { FireChatCompletionResponse } from "../types/fire-chat-completion-response";
import { FireChatCompletionStreamingResponse } from "../types/fire-chat-completion-streaming-response";
import { KeyProvider } from "../interfaces/key-provider";
import { RequestContext } from "../types/request-context";

export class ProcessedModelProvider implements ModelProvider {
	nested: ModelProvider;
	processor: Processor;

	constructor(nested: ModelProvider, processor: Processor) {
		this.nested = nested;
		this.processor = processor;
	}

	doRequest(
		req: FireChatCompletionRequest,
		ctx: RequestContext,
	): Promise<FireChatCompletionResponse> {
		return this.nested.doRequest(this.processor.process(req), ctx);
	}

	doStreamingRequest(
		req: FireChatCompletionRequest,
		ctx: RequestContext,
	): FireChatCompletionStreamingResponse {
		return this.nested.doStreamingRequest(
			this.processor.process(req),
			ctx,
		);
	}

	addKeyProvider(keyProvider: KeyProvider) {
		this.nested.addKeyProvider(keyProvider);
	}
}
