import { IReyContract } from "../rey-contract";
import { VerifyError } from "./errors";
import JwtTokenParser, { IJwtTokenParserOptions } from "./jwt-token-parser";
import { AppParams, ITokenParser } from "./types";

export default class ContractTokenParser extends JwtTokenParser implements ITokenParser {
  private contract: IReyContract;

  constructor(opts: IContractTokenParserOptions) {
    super(opts);
    this.contract = opts.contract;
  }

  /**
   * Parses the given token as a JWT and validates the request
   * part from it against the #validateRequest of the ReySmartcontract
   * @param token The token to verify
   */
  public async verify(token: string): Promise<AppParams> {
    const appParams = await this.parse(token);
    try {
      this.logger.debug(`Verifying token: ${token}`);
      await this.contract.validateRequest(appParams.request);
      this.logger.verbose(`Token correctly verified: ${token}`);
      return appParams;
    } catch (e) {
      this.logger.debug(`Token verification error: ${e}, ${token}`);
      throw new VerifyError(e);
    }
  }
}

type IContractTokenParserOptions = IJwtTokenParserOptions & {
  contract: IReyContract;
};
