import { ProcessorConfiguration } from "../config.js";
import { Processor } from "../interfaces/processor.js";
import { NoDanglingSysProcessor } from "../processor/no-dangling-sys-processor.js";
import { NoSysProcessor } from "../processor/no-sys-processor.js";
import { OverrideSamplersProcessor } from "../processor/override-samplers-processor.js";
import { RegexProcessor } from "../processor/regex-processor.js";

class ProcessorFactory {
	makeProcessor(conf: ProcessorConfiguration): Processor {
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
		}
	}
}

export const processorFactory = new ProcessorFactory();
