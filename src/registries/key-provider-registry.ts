import { KeyProviderConfiguration } from "../config";
import { KeyProvider } from "../interfaces/key-provider.js";
import { SimpleEnvironmentKeyProvider } from "../key-providers/simple-environment-key-provider.js";
import { SimpleLiteralKeyProvider } from "../key-providers/simple-literal-key-provider.js";

class KeyProviderRegistry {
	globalKeyProviders: Map<string, KeyProvider>;

	constructor() {
		this.globalKeyProviders = new Map();
	}

	makeKeyProvider(conf: KeyProviderConfiguration): KeyProvider {
		switch (conf.type) {
			case "environment": {
				return new SimpleEnvironmentKeyProvider(conf);
			}
			case "literal": {
				return new SimpleLiteralKeyProvider(conf);
			}
		}
	}

	registerKeyProvider(name: string, keyProvider: KeyProvider): void {
		this.globalKeyProviders.set(name, keyProvider);
	}

	getKeyProvider(conf: string | KeyProviderConfiguration): KeyProvider {
		if (typeof conf !== "string") {
			return this.makeKeyProvider(conf);
		}

		const keyProvider = this.globalKeyProviders.get(conf);
		if (keyProvider === undefined) {
			throw new Error(`Couldn't find keyProvider ${conf}!`);
		}

		return keyProvider;
	}
}

export const keyProviderRegistry = new KeyProviderRegistry();
