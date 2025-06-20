export async function* delayedAsyncIterable<T>(
	iterable: AsyncIterable<T>,
	delay: number,
): AsyncGenerator<T> {
	const iterator = iterable[Symbol.asyncIterator]();

	for (;;) {
		const [res] = await Promise.all([
			iterator.next(),
			new Promise((resolve) => setTimeout(resolve, delay)),
		]);

		if (res.done) {
			break;
		}

		yield res.value;
	}
}
