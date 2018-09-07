import { Request } from "rey-sdk";
import Web3 from "web3";
import EthContract from "web3/eth/contract";
import winston from "winston";
import { IReyContract } from "./types";
import { validateRequest } from "./validations";

interface IReyEthContractOptions {
  logger: winston.Logger;
  web3: Web3;
  appAddress: string;
  contractAddress: string;
}

export default class ReyEthContract implements IReyContract {
  private logger: winston.Logger;
  private contract: EthContract;
  private appAddress: string;
  private readonly CONTRACT_ABI = require("./contract-abi.json");

  constructor(opts: IReyEthContractOptions) {
    this.logger = opts.logger;
    this.contract = new opts.web3.eth.Contract(this.CONTRACT_ABI, opts.contractAddress);
    this.appAddress = opts.appAddress;
  }

  public validateRequest(request: Request): Promise<void> {
    this.locallyValidateRequest(request);
    const arg = request.toABI();
    this.logger.debug(`Invoking smart contract #validateRequest with: ${JSON.stringify(arg)}`);
    return this.contract.methods.validateRequest(arg).call({ from: this.appAddress });
  }

  /**
   * Validates the provided request
   * @param request
   * @throws {Error} if request is not valid (see {@link validateRequest})
   * @throws {Error} if request source and configured app address do not matchs
   */
  private locallyValidateRequest(request: Request) {
    validateRequest(request); // Partial local validation, so we can debug it easier
    const source = request.readPermission.source.toLowerCase();
    const app = this.appAddress.toLowerCase();
    if (source !== app) {
      throw new Error(`request read permission source(${source}) does not match app address(${app})`);
    }
  }
}
