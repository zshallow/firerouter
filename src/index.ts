import fs from "fs/promises";
import cors from "@fastify/cors";
import YAML from "yaml";
import { ConfigSchema } from "./config.js";
import { FireChatCompletionRequestSchema } from "./types/fire-chat-completion-request.js";
import { encodeData } from "eventsource-encoder";
import Fastify from "fastify";
import { keyProviderRegistry } from "./registries/key-provider-registry.js";
import { modelRegistry } from "./registries/model-registry.js";
import { processorRegistry } from "./registries/processor-registry.js";
import { delayedAsyncIterable } from "./utils/delayed-async-iterable.js";
import { splitChunks } from "./utils/split-chunks.js";

async function main() {
	const configFilePath = new URL("../config.yaml", import.meta.url);
	const configFile = await fs.readFile(configFilePath, {
		encoding: "utf-8",
	});
	const config = ConfigSchema.parse(YAML.parse(configFile));

	for (const [name, processorConfig] of config.processors) {
		processorRegistry.registerProcessor(
			name,
			processorRegistry.makeProcessor(processorConfig),
		);
	}

	for (const [name, keyProviderConfig] of config.keyProviders) {
		keyProviderRegistry.registerKeyProvider(
			name,
			keyProviderRegistry.makeKeyProvider(keyProviderConfig),
		);
	}

	for (const [name, modelProviderConfig] of config.modelProviders) {
		modelRegistry.registerModels(name, modelProviderConfig);
	}

	const fastify = Fastify({
		logger: true,
	});

	await fastify.register(cors, {
		origin: "*",
		methods: ["GET", "POST", "OPTIONS"],
	});

	fastify.get("/v1/models", function () {
		const modelsList = Array.from(modelRegistry.models.keys())
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
				// GIVE ME AN ABORTSIGNAL DAMN IT
				fastify.log.debug(
					"Request cancelled by client!",
				);
				controller.abort("Original request cancelled.");
			}
		});

		const requestBody = FireChatCompletionRequestSchema.parse(
			req.body,
		);

		console.debug("Raw request body!");
		console.debug(YAML.stringify(requestBody));

		const modelProvider = modelRegistry.models.get(
			requestBody.model,
		);

		if (!modelProvider) {
			throw new Error(
				"Bad request: model ${requestBody.model} not found!",
			);
		}

		const ctx = { logger: req.log, signal: controller.signal };

		if (requestBody.stream) {
			let chunkIterator = modelProvider.doStreamingRequest(
				requestBody,
				ctx,
			);

			if (config.streamingInterval > 0) {
				chunkIterator = delayedAsyncIterable(
					splitChunks(chunkIterator),
					config.streamingInterval,
				);
			}

			res.raw.writeHead(200, {
				"Content-Type": "text/event-stream",
				"Access-Control-Allow-Origin": "*",
			});

			try {
				for await (const chunk of chunkIterator) {
					res.raw.write(
						encodeData(
							JSON.stringify(chunk),
						),
					);
				}
			} catch (e) {
				req.log.error(e, `Error during stream!`);
				if (!res.raw.writableEnded) {
					res.raw.write(
						encodeData(JSON.stringify(e)),
					);
				}
			} finally {
				if (!res.raw.writableEnded) {
					res.raw.end();
				}
			}
		} else {
			const response = await modelProvider.doRequest(
				requestBody,
				ctx,
			);

			res.status(200)
				.header("Content-Type", "application/json")
				.send(response);
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
