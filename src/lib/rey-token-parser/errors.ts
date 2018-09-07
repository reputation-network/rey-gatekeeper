// tslint:disable:max-classes-per-file
import CausedByError from "../errors/caused-by-error";

export class ParseError extends CausedByError {
  constructor(e: string|Error) {
    super(e);
    this.name = "ParseError";
    Object.setPrototypeOf(this, ParseError.prototype);
  }
}

export class VerifyError extends CausedByError {
  constructor(e: string|Error) {
    super(e);
    this.name = "VerifyError";
    Object.setPrototypeOf(this, VerifyError.prototype);
  }
}
