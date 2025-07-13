import { ProcessorConfiguration } from "../config.js";
import { Processor } from "../interfaces/processor.js";
import { NoDanglingSysProcessor } from "../processor/no-dangling-sys-processor.js";
import { NoSysProcessor } from "../processor/no-sys-processor.js";
import { OverrideSamplersProcessor } from "../processor/override-samplers-processor.js";
import { RegexProcessor } from "../processor/regex-processor.js";
import { RandomProcessor } from "../processor/random-processor.js";
import { NoassProcessor } from "../processor/noass-processor.js";
import { SquashProcessor } from "../processor/squash-processor.js";
import { ChainProcessor } from "../processor/chain-processor.js";
import { InsertMessageProcessor } from "../processor/insert-message-processor.js";
import { WeightedOption } from "../utils/random-selection-with-weights.js";
import { WhitespaceProcessor } from "../processor/whitespace-processor.js";

class ProcessorRegistry {
	private globalProcessors: Map<string, Processor>;

	constructor() {
		this.globalProcessors = new Map();
	}

	makeProcessor(conf: ProcessorConfiguration): Processor {
		if (Array.isArray(conf)) {
			const chainConf = conf as ProcessorConfiguration[];
			return new ChainProcessor(
				chainConf.map((config) =>
					this.makeProcessor(config),
				),
			);
		}

		switch (conf.type) {
			case "nodanglingsys": {
				return new NoDanglingSysProcessor();
			}
			case "nosys": {
				return new NoSysProcessor();
			}
			case "overridesamplers": {
				return new OverrideSamplersProcessor(conf);
			}
			case "regex": {
				return new RegexProcessor(conf);
			}
			case "random": {
				const processorWeights: WeightedOption<Processor>[] =
					[];

				if (conf.processorWeights !== undefined) {
					const rawProcessorWeights =
						conf.processorWeights as {
							weight: number;
							config: ProcessorConfiguration;
						}[];

					for (const p of rawProcessorWeights) {
						processorWeights.push([
							this.makeProcessor(
								p.config,
							),
							p.weight,
						]);
					}
				} else if (conf.processorList !== undefined) {
					const rawProcessorList =
						conf.processorList as ProcessorConfiguration[];
					for (const p of rawProcessorList) {
						processorWeights.push([
							this.makeProcessor(p),
							1,
						]);
					}
				} else {
					throw new Error(
						"`random` processor requires either a `processorList` or a `processorWeights`!",
					);
				}

				return new RandomProcessor(processorWeights);
			}
			case "noass": {
				return new NoassProcessor(conf);
			}
			case "squash": {
				return new SquashProcessor(conf);
			}
			case "chain": {
				// This is the correct type at build time, zod just doesn't deal
				// perfectly with circular references
				const processorConfigurations =
					conf.processors as ProcessorConfiguration[];

				return new ChainProcessor(
					processorConfigurations.map((conf) =>
						this.makeProcessor(conf),
					),
				);
			}
			case "insertmessage": {
				return new InsertMessageProcessor(conf);
			}
			case "whitespace": {
				return new WhitespaceProcessor();
			}
		}
	}

	registerProcessor(name: string, processor: Processor): void {
		this.globalProcessors.set(name, processor);
	}

	getProcessor(conf: string | ProcessorConfiguration): Processor {
		if (typeof conf !== "string") {
			return this.makeProcessor(conf);
		}

		const keyProvider = this.globalProcessors.get(conf);
		if (keyProvider === undefined) {
			throw new Error(`Couldn't find keyProvider ${conf}!`);
		}

		return keyProvider;
	}
}

export const processorRegistry = new ProcessorRegistry();
