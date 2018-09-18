import { ErrorRequestHandler, RequestHandler } from "express";
import { StreamOptions as MorganStreamOptions } from "morgan";
import Web3 from "web3";
import winston, { Logger } from "winston";
import { Config } from "./config";
import Memoize from "./lib/memoize";
import { IReyContract, ReyEthContract } from "./lib/rey-contract";
import { ContractTokenParser, ITokenParser } from "./lib/rey-token-parser";

import makeHealthcheckController from "./controllers/healthcheck";
import makeManifestController from "./controllers/manifest";
import makeErrorHandlerMiddleware from "./middlewares/error-handler";
import makeGatekeeperMiddleware from "./middlewares/gatekeeper";
import makeProxyMiddleware from "./middlewares/proxy";
import makeXPoweredByMiddleware from "./middlewares/x-powered-by";

export default class AppContext {
  private config: Config;

  constructor(conf: Config) {
    this.config = conf;
  }

  @Memoize()
  public get logger(): Logger {
    return winston.createLogger({
      level: this.config.LOG_LEVEL,
      format: winston.format.simple(),
      transports: new winston.transports.Console(),
    });
  }

  // This allows morgan access logs to be handled via winston logger
  @Memoize()
  public get morganStream(): MorganStreamOptions {
    return {
      write: (str) => {
        if (this.config.ENABLE_HTTP_LOG) {
          this.logger.info(str.replace(/[\n\r]+$/, ""));
        }
      },
    };
  }

  @Memoize()
  public get permissionParser(): ITokenParser {
    return new ContractTokenParser({
      contract: this.reyContract,
      logger: this.logger,
    });
  }

  @Memoize()
  public get healthcheckController(): RequestHandler {
    return makeHealthcheckController();
  }

  @Memoize()
  public get manifestController(): RequestHandler {
    return makeManifestController({
      logger: this.logger,
      manifestUrl: this.config.MANIFEST_URL,
    });
  }

  @Memoize()
  public get gatekeeperMiddleware(): RequestHandler {
    return makeGatekeeperMiddleware({
      tokenParser: this.permissionParser,
    });
  }

  @Memoize()
  public get proxyMiddleware(): RequestHandler {
    return makeProxyMiddleware({
      logger: this.logger,
      target: this.config.TARGET_URL,
    });
  }

  @Memoize()
  public get xPoweredByMiddleware(): RequestHandler {
    return makeXPoweredByMiddleware();
  }

  @Memoize()
  public get errorHandlerMiddleware(): ErrorRequestHandler {
    return makeErrorHandlerMiddleware({
      logger: this.logger,
    });
  }

  @Memoize()
  public get web3(): Web3 {
    return new Web3(this.config.BLOCKCHAIN_NODE_URL);
  }

  @Memoize()
  public get reyContract(): IReyContract {
    return new ReyEthContract({
      web3: this.web3,
      logger: this.logger,
      appAddress: this.config.APP_ADDRESS,
      contractAddress: this.config.REY_CONTRACT_ADDRESS,
    });
  }
}
