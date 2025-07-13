import { FireChatCompletionChunk } from "../types/fire-chat-completion-streaming-response";

export async function* splitChunks(
	iterable: AsyncIterable<FireChatCompletionChunk>,
): AsyncGenerator<FireChatCompletionChunk> {
	let id = 0;

	for await (const chunk of iterable) {
		if (chunk.choices === undefined) {
			continue;
		}

		for (const choice of chunk.choices) {
			if (
				choice.delta === undefined ||
				choice.delta.content === undefined
			) {
				continue;
			}

			for (const c of choice.delta.content) {
				yield {
					id: (id++).toString(),
					model: chunk.model,
					object: chunk.object,
					created: chunk.created,
					choices: [
						{
							index: choice.index,
							delta: {
								role: choice
									.delta
									.role,
								content: c,
							},
							finish_reason:
								choice.finish_reason,
						},
					],
				};
			}
		}
	}
}
