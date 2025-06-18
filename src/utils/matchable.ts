export interface Matchable {
	match(s: string): boolean;
}

export class RegexMatchable implements Matchable {
	re: RegExp;

	constructor(re: RegExp) {
		this.re = re;
	}

	match(s: string): boolean {
		return this.re.test(s);
	}
}

export class UnionMatchable implements Matchable {
	matchables: Matchable[];

	constructor(matchables: Matchable[]) {
		this.matchables = matchables;
	}

	match(s: string): boolean {
		return this.matchables.some((m) => m.match(s));
	}
}
