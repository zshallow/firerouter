import { Processor } from "../interfaces/processor";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request";
import { OverrideSamplersProcessorConfiguration } from "../config";

export class OverrideSamplersProcessor implements Processor {
	config: OverrideSamplersProcessorConfiguration;

	constructor(conf: OverrideSamplersProcessorConfiguration) {
		this.config = conf;
	}

	process(req: FireChatCompletionRequest): FireChatCompletionRequest {
		if (this.config.temperature === "unset") {
			delete req.temperature;
		} else if (this.config.temperature) {
			req.temperature = this.config.temperature;
		}

		if (this.config.topP === "unset") {
			delete req.top_p;
		} else if (this.config.topP) {
			req.top_p = this.config.topP;
		}

		if (this.config.topK === "unset") {
			delete req.top_k;
		} else if (this.config.topK) {
			req.top_k = this.config.topK;
		}

		if (this.config.topA === "unset") {
			delete req.top_a;
		} else if (this.config.topA) {
			req.top_a = this.config.topA;
		}

		if (this.config.minP === "unset") {
			delete req.min_p;
		} else if (this.config.minP) {
			req.min_p = this.config.minP;
		}

		if (this.config.frequencyPenalty === "unset") {
			delete req.frequency_penalty;
		} else if (this.config.frequencyPenalty) {
			req.frequency_penalty = this.config.frequencyPenalty;
		}

		if (this.config.repetitionPenalty === "unset") {
			delete req.repetition_penalty;
		} else if (this.config.repetitionPenalty) {
			req.repetition_penalty = this.config.repetitionPenalty;
		}

		if (this.config.presencePenalty === "unset") {
			delete req.presence_penalty;
		} else if (this.config.presencePenalty) {
			req.presence_penalty = this.config.presencePenalty;
		}

		return req;
	}
}
