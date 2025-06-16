import { z } from "zod/v4";

export class SimpleEnvironmentKeyProvider implements KeyProvider {
	key: string;

	constructor(envVar: string) {
		if (!process.env[envVar]) {
			throw "Failed to initialize SimpleEnvironmentKeyProvider!";
		}

		this.key = process.env[envVar];
	}

	provide(): string {
		return this.key;
	}
}

export const SimpleEnvironmentKeyProviderConfigurationSchema = z.object({
	type: z.literal("environment"),
	envVar: z.string(),
});
