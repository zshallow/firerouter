export interface KeyProvider {
	withKey<T>(sgn: AbortSignal, func: (key: string) => T): T;
}
