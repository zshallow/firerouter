export function chunkByLevel<T>(arr: T[], levelFn: (t: T) => unknown): T[][] {
	const ret: T[][] = [];

	let curr: T[] = [];
	let prevLevel: unknown = undefined;

	for (const t of arr) {
		if (curr.length === 0 || levelFn(t) === prevLevel) {
			curr.push(t);
		} else {
			ret.push(curr);
			curr = [t];
		}

		prevLevel = levelFn(t);
	}

	if (curr.length > 0) {
		ret.push(curr);
	}

	return ret;
}
