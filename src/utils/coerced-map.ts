import { z } from "zod/v4";
import { SomeType } from "zod/v4/core";

export function coercedMap<K extends SomeType, V extends SomeType>(
	keySchema: K,
	valueSchema: V,
) {
	return z.preprocess(
		(val) => {
			if (val instanceof Map) {
				return val;
			}

			if (
				typeof val === "object" &&
				val !== null &&
				!Array.isArray(val)
			) {
				return new Map(Object.entries(val));
			}

			return val;
		},
		z.map(keySchema, valueSchema),
	);
}
