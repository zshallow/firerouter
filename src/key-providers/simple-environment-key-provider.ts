import { KeyProvider } from "../interfaces/key-provider";
import { SimpleEnvironmentKeyProviderConfiguration } from "../config";

export class SimpleEnvironmentKeyProvider implements KeyProvider {
	key: string;

	constructor(config: SimpleEnvironmentKeyProviderConfiguration) {
		const key = process.env[config.envVar];
		if (!key) {
			throw new Error(
				`Failed to initialize SimpleEnvironmentKeyProvider! EnvVar ${config.envVar} could not be loaded!`,
			);
		}

		this.key = key;
	}

	provide(): string {
		return this.key;
	}
}
