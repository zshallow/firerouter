import fs from "fs/promises";
import YAML from "yaml";
import { ConfigSchema } from "./config.js";
import { FireChatCompletionRequestSchema } from "./types/fire-chat-completion-request.js";
import { encodeData } from "eventsource-encoder";
import { ModelProvider } from "./interfaces/model-provider.js";
import Fastify from "fastify";
import { RegexMatchable, UnionMatchable } from "./utils/matchable.js";
import { ChainProcessor } from "./processor/chain-processor.js";
import { keyProviderFactory } from "./factories/key-provider-factory.js";
import { modelProviderFactory } from "./factories/model-provider-factory.js";
import { processorFactory } from "./factories/processor-factory.js";
import { ProcessedModelProvider } from "./model-providers/processed-model-provider.js";
import { Processor } from "./interfaces/processor.js";
import { delayedAsyncIterable } from "./utils/delayed-async-iterable.js";

async function main() {
	const configFilePath = new URL("../config.yaml", import.meta.url);
	const configFile = await fs.readFile(configFilePath, {
		encoding: "utf-8",
	});
	const config = ConfigSchema.parse(YAML.parse(configFile));

	const processorChains: Map<string, Processor> = new Map();
	for (const [name, processorChainConfig] of config.processorChains) {
		const processorChain = new ChainProcessor(
			processorChainConfig.map(function (processorConfig) {
				return processorFactory.makeProcessor(
					processorConfig,
				);
			}),
		);

		processorChains.set(name, processorChain);
	}

	const modelProviders: Map<string, ModelProvider> = new Map();
	for (const [name, modelConfig] of config.modelProviders) {
		let modelProvider: ModelProvider =
			modelProviderFactory.makeModelProvider(modelConfig, {
				modelsProvider: modelProviders,
			});

		if (modelConfig.processorChain) {
			const chain = processorChains.get(
				modelConfig.processorChain,
			);
			if (chain === undefined) {
				throw new Error(
					`Could not find chain ${modelConfig.processorChain}`,
				);
			}

			modelProvider = new ProcessedModelProvider(
				modelProvider,
				chain,
			);
		}

		modelProviders.set(name, modelProvider);
	}

	for (const [, keyConfig] of config.keyProviders) {
		const keyProvider =
			keyProviderFactory.makeKeyProvider(keyConfig);

		const m = new UnionMatchable(
			keyConfig.modelTargets.map(
				(s) => new RegexMatchable(new RegExp(s)),
			),
		);

		for (const [name, modelProvider] of modelProviders) {
			if (m.match(name)) {
				modelProvider.addKeyProvider(keyProvider);
			}
		}
	}

	const fastify = Fastify({
		logger: true,
	});

	fastify.get("/v1/models", function () {
		const modelsList = Array.from(modelProviders.keys())
			.sort()
			.map((name) => {
				return {
					id: name,
					object: "model",
					owned_by: ":3",
				};
			});

		return {
			object: "list",
			data: modelsList,
		};
	});

	fastify.post("/v1/chat/completions", async function (req, res) {
		const controller = new AbortController();

		req.raw.on("close", () => {
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			if (req.raw.aborted) {
				// Yes, aborted is deprecated. But destroyed...doesn't work??? Lol.
				// I love the nodejs standard library.
				fastify.log.debug(
					"Request cancelled by client!",
				);
				controller.abort("Original request cancelled.");
			}
		});

		const requestBody = FireChatCompletionRequestSchema.parse(
			req.body,
		);

		const modelProvider = modelProviders.get(requestBody.model);
		if (!modelProvider) {
			throw new Error(
				"Bad request: model ${requestBody.model} not found!",
			);
		}

		if (requestBody.stream) {
			let chunkIterator = modelProvider.doStreamingRequest(
				requestBody,
				{ logger: req.log, signal: controller.signal },
			);

			if (config.streamingInterval > 0) {
				chunkIterator = delayedAsyncIterable(
					chunkIterator,
					config.streamingInterval,
				);
			}

			//Ensures we only send headers once and only send them when the request is guaranteed OK.
			let firstChunk = true;

			for await (const chunk of chunkIterator) {
				if (firstChunk) {
					res.status(200);
					res.header(
						"Content-Type",
						"text/event-stream",
					);
					firstChunk = false;
				}

				res.raw.write(
					encodeData(JSON.stringify(chunk)),
				);
			}

			res.raw.end();
		} else {
			const response = await modelProvider.doRequest(
				requestBody,
				{ logger: req.log, signal: controller.signal },
			);
			res.status(200);
			res.header("Content-Type", "application/json");
			res.send(response);
		}
	});

	fastify.listen({ port: config.port }, function (err) {
		if (err) {
			fastify.log.error(err);
			process.exit(1);
		}
	});
}

main().catch((err: unknown) => {
	console.error(err);
});
