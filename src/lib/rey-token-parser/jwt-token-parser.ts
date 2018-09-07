import jwt from "jsonwebtoken";
import winston from "winston";
import { ParseError } from "./errors";
import { AppParams } from "./types";

export default class JwtTokenParser {
  protected logger: winston.Logger;
  constructor(opts: IJwtTokenParserOptions) {
    this.logger = opts.logger;
  }

  /**
   * Attemtps to parse the given token as a JWT.
   * @param token JWT to decode
   * @throws {ParseError} if token cant be parsed as JWT
   * @throws {ParseError} if JWT payload is not a valid AppParams
   */
  public async parse(token: string): Promise<AppParams> {
    try {
      this.logger.debug(`Parsing JWT: ${token}`);
      const appAccess = this.parseToken(token);
      this.logger.verbose(`JWT correctly parsed: ${token} into ${JSON.stringify(appAccess)}`);
      return appAccess;
    } catch (e) {
      this.logger.debug(`JWT parsing error: ${e}, ${token}`);
      throw new ParseError(e);
    }
  }

  private parseToken(token: string): AppParams {
    const payload = jwt.decode(token);
    if (!payload || typeof payload === "string") {
      throw new TypeError("wrong jwt payload format");
    }
    return new AppParams(payload);
  }
}

export interface IJwtTokenParserOptions {
  logger: winston.Logger;
}
