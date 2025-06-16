import { z } from "zod/v4";

export class SimpleLiteralKeyProvider implements KeyProvider {
	key: string;

	constructor(key: string) {
		this.key = key;
	}

	provide(): string {
		return this.key;
	}
}

export const SimpleLiteralKeyProviderConfigurationSchema = z.object({
	type: z.literal("literal"),
	key: z.string(),
});
