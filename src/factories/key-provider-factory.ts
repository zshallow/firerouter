import { KeyProviderConfiguration } from "../config";
import { KeyProvider } from "../interfaces/key-provider.js";
import { SimpleEnvironmentKeyProvider } from "../key-providers/simple-environment-key-provider.js";
import { SimpleLiteralKeyProvider } from "../key-providers/simple-literal-key-provider.js";

class KeyProviderFactory {
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
}

export const keyProviderFactory = new KeyProviderFactory();
