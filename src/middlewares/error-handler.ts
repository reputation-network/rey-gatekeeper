import * as express from "express";
import * as winston from "winston";
import HttpError from "../lib/errors/http-error";

interface IErrorHandlerMiddlewareOptions {
  logger: winston.Logger;
}

/**
 * Returns the express error handler for the Gatekeeper Server.
 * The handler will catch HttpErrors and resolve the request.
 *
 * If the caught error is not an HttpError, it will be treated as an exception,
 * causing the process to exit with status code 1 after logging the error stack.
 *
 * @see https://expressjs.com/en/guide/error-handling.html
 */
export default function makeErrorHandlerMiddleware(opts: IErrorHandlerMiddlewareOptions) {
  return (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!(err instanceof HttpError)) {
      opts.logger.error(err.stack || err.message);
      return process.exit(1);
    }
    opts.logger.debug(err.stack || err.message);
    res.status(err.statusCode);
    res.json({ error: err.message });
    next(err);
  };
}
