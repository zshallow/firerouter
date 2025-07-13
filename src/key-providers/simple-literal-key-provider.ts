import { KeyProvider } from "../interfaces/key-provider";
import { SimpleLiteralKeyProviderConfiguration } from "../config";

export class SimpleLiteralKeyProvider implements KeyProvider {
	key: string;

	constructor(config: SimpleLiteralKeyProviderConfiguration) {
		this.key = config.key;
	}

	withKey<T>(sgn: AbortSignal, func: (key: string) => T): T {
		return func(this.key);
	}
}
