/**
 * Error class wrapper for verbosity. Throwing a CausedByError
 * allows to keep track of error stacks when rethrowing. This is
 * specially useful on async processing.
 */
export default class CausedByError extends Error {
  constructor(error: string | Error, message?: string) {
    super(message || (error instanceof Error ? error.message : error));
    this.name = "CausedByError";
    Object.setPrototypeOf(this, CausedByError.prototype);
    if (error instanceof Error) {
      this.stack = [
        this.stack,
        `Caused by: ${error.stack || "[no stack]"}`,
      ].join("\n");
    }
  }
}
