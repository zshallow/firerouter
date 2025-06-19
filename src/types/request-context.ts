import { FastifyBaseLogger } from "fastify";

export type RequestContext = {
	signal: AbortSignal;
	logger: FastifyBaseLogger;
};
