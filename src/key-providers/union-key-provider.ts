import { KeyProvider } from "../interfaces/key-provider";

export class UnionKeyProvider implements KeyProvider {
	nested: KeyProvider[];
	pos: number;

	constructor(keyProviders: KeyProvider[]) {
		this.nested = keyProviders;
		this.pos = 0;
	}

	addKeyProvider(keyProvider: KeyProvider) {
		this.nested.push(keyProvider);
	}

	provide(): string {
		if (this.nested.length === 0) {
			throw new Error(
				"UnionKeyProvider empty! Unable to provide a key!",
			);
		}

		// Add 1, loop around on overflow
		this.pos++;
		if (this.pos === this.nested.length) {
			this.pos = 0;
		}

		return this.nested[this.pos].provide();
	}
}
