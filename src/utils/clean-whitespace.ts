export function cleanWhitespace(s: string): string {
	return s.trim().replaceAll(/\s+/g, function (match: string): string {
		if (match.indexOf("\n") !== match.lastIndexOf("\n")) {
			return "\n\n";
		}

		if (match.includes("\n")) {
			return "\n";
		}

		return " ";
	});
}
