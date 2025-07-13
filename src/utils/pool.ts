export class Pool<T> {
	private readonly timeout: number;

	private available: T[];
	private waitlist: {
		res: (t: T) => void;
		rej: (reason: Error) => void;
		sgn: AbortSignal;
	}[];

	constructor(available: T[], timeout: number) {
		this.available = available;
		this.timeout = timeout;
		this.waitlist = [];
	}

	get(sgn: AbortSignal): Promise<T> {
		if (sgn.aborted) {
			return Promise.reject(
				new Error(
					`Promise rejected due to AbortSignal!`,
				),
			);
		}

		if (this.available.length > 0) {
			// We've LITERALLY just checked in the above line if we can call shift.
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			return Promise.resolve(this.available.shift()!);
		}

		return new Promise<T>((_res, _rej) => {
			if (this.timeout > 0) {
				sgn = AbortSignal.any([
					sgn,
					AbortSignal.timeout(this.timeout),
				]);
			}

			const cancellationListener = function (): void {
				_rej(
					new Error(
						`Promise rejected due to AbortSignal!`,
					),
				);
			};

			//Cancel on abort!
			sgn.addEventListener("abort", cancellationListener);

			//No dangling listeners!
			const res = function (t: T | PromiseLike<T>): void {
				sgn.removeEventListener(
					"abort",
					cancellationListener,
				);
				_res(t);
			};

			//No dangling listeners here either (I hate JS)!
			const rej = function (reason: Error): void {
				sgn.removeEventListener(
					"abort",
					cancellationListener,
				);
				_rej(reason);
			};

			this.waitlist.push({
				res,
				rej,
				sgn,
			});
		});
	}

	return(t: T): void {
		this.available.push(t);

		while (this.waitlist.length > 0) {
			// We've LITERALLY just checked in the above line if we can call shift.
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const wp = this.waitlist.shift()!;
			if (wp.sgn.aborted) {
				continue;
			}

			// Trvst
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			wp.res(this.available.shift()!);
			return;
		}
	}

	async use<R>(fn: (t: T) => Promise<R>, sgn: AbortSignal): Promise<R> {
		const t = await this.get(sgn);

		try {
			return await fn(t);
		} finally {
			this.return(t);
		}
	}
}
