import { Processor } from "../interfaces/processor.js";
import { FireChatCompletionRequest } from "../types/fire-chat-completion-request.js";
import {
	normalizeWeightedOptions,
	selectRandomOption,
	WeightedOption,
} from "../utils/random-selection-with-weights.js";

export class RandomProcessor implements Processor {
	weightedProcessors: WeightedOption<Processor>[];

	constructor(weightedProcessors: WeightedOption<Processor>[]) {
		this.weightedProcessors =
			normalizeWeightedOptions(weightedProcessors);
	}

	process(req: FireChatCompletionRequest): FireChatCompletionRequest {
		const processor = selectRandomOption(this.weightedProcessors);
		return processor.process(req);
	}
}
