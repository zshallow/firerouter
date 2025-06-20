export type WeightedOption<T> = [T, number];

export function normalizeWeightedOptions<T>(
	opts: WeightedOption<T>[],
): WeightedOption<T>[] {
	if (opts.length === 0) {
		throw new Error("At least one option must be provided!");
	}

	let sum = 0;
	for (const [, weight] of opts) {
		if (!Number.isFinite(weight) || weight <= 0) {
			throw new Error(
				"Weights must be non-zero and positive.",
			);
		}

		sum += weight;
	}

	return opts.map(function ([opt, weight]): WeightedOption<T> {
		return [opt, weight / sum];
	});
}

export function selectRandomOption<T>(normalizedOpts: WeightedOption<T>[]): T {
	if (normalizedOpts.length === 0) {
		throw new Error("Expected at least one option!");
	}

	const r = Math.random();
	let acc = 0;

	for (const [opt, weight] of normalizedOpts) {
		acc += weight;
		if (acc >= r) {
			return opt;
		}
	}

	return normalizedOpts[normalizedOpts.length - 1][0];
}
