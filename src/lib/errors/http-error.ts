import CausedByError from "./caused-by-error";

/**
 * Error wrapper for handled errors. This is the only type of error
 * that middlewares are allowed to throw or pass to next. Any other
 * type of error thrown will be treated as an exception, causing the
 * program to exit.
 */
export default class HttpError extends CausedByError {
  constructor(
    public readonly statusCode: HttpStatus,
    error: string | Error,
    message?: string,
  ) {
    super(error, message);
    this.name = "HttpError";
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export enum HttpStatus {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}
