import { TrivialModelProvider } from "./model-providers/trivial-model-provider.js";
import fs from "fs/promises";
import YAML from "yaml";
import { ConfigSchema } from "./config.js";
import { SimpleEnvironmentKeyProvider } from "./key-providers/simple-environment-key-provider.js";
import { SimpleLiteralKeyProvider } from "./key-providers/simple-literal-key-provider.js";
import { FireChatCompletionRequestSchema } from "./types/fire-chat-completion-request.js";
import { encodeData } from "eventsource-encoder";
import { OpenrouterModelProvider } from "./model-providers/openrouter-model-provider.js";
import { ModelProvider } from "./interfaces/model-provider.js";
import Fastify from "fastify";
import { RandomModelProvider } from "./model-providers/random-model-provider.js";

async function main() {
	const configFilePath = new URL("../config.yaml", import.meta.url);
	const configFile = await fs.readFile(configFilePath, {
		encoding: "utf-8",
	});
	const config = ConfigSchema.parse(YAML.parse(configFile));

	const keyProviders = new Map();

	for (const [name, keyConfig] of config.keyProviders) {
		switch (keyConfig.type) {
			case "environment": {
				keyProviders.set(
					name,
					new SimpleEnvironmentKeyProvider(
						keyConfig.envVar,
					),
				);
				break;
			}
			case "literal": {
				keyProviders.set(
					name,
					new SimpleLiteralKeyProvider(
						keyConfig.key,
					),
				);
				break;
			}
		}
	}

	const modelProviders: Map<string, ModelProvider> = new Map();

	for (const [name, modelConfig] of config.modelProviders) {
		switch (modelConfig.type) {
			case "trivial": {
				modelProviders.set(
					name,
					new TrivialModelProvider(modelConfig),
				);
				break;
			}
			case "openrouter": {
				const keyProvider = keyProviders.get(
					modelConfig.keyProvider,
				);
				if (!keyProvider) {
					throw `Model Provider ${name} required Key Provider ${modelConfig.keyProvider}: not found!`;
				}

				modelProviders.set(
					name,
					new OpenrouterModelProvider(
						keyProvider,
						modelConfig,
					),
				);
				break;
			}
			case "random": {
				modelProviders.set(
					name,
					new RandomModelProvider(
						modelProviders,
						modelConfig,
					),
				);
				break;
			}
		}
	}

	const fastify = Fastify({
		logger: true,
	});

	fastify.get("/v1/models", async function (req, res) {
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
		const requestBody = FireChatCompletionRequestSchema.parse(
			req.body,
		);

		const modelProvider = modelProviders.get(requestBody.model);
		if (!modelProvider) {
			throw `Bad request: model ${requestBody.model} not found!`;
		}

		if (requestBody.stream) {
			const chunkIterator =
				modelProvider.doStreamingRequest(requestBody);

			res.status(200);
			res.header("Content-Type", "text/event-stream");

			for await (const chunk of chunkIterator) {
				res.raw.write(
					encodeData(JSON.stringify(chunk)),
				);
			}

			res.raw.end();
		} else {
			const response =
				await modelProvider.doRequest(requestBody);
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

main().catch((err) => console.error(err));
