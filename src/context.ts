import { ErrorRequestHandler, RequestHandler } from "express";
import { StreamOptions as MorganStreamOptions } from "morgan";
import ReyContract from "rey-sdk/dist/contracts/rey";
import EthPersonalSignStrategy from "rey-sdk/dist/sign-strategies/eth-personal";
import { SignStrategy } from "rey-sdk/dist/types";
import winston, { Logger } from "winston";
import { Config } from "./config";
import Memoize from "./lib/memoize";
import LocalReyContract from "./lib/rey-contract";
import { ContractTokenParser, ITokenParser } from "./lib/rey-token-parser";

import makeHealthcheckController from "./controllers/healthcheck";
import makeErrorHandlerMiddleware from "./middlewares/error-handler";
import makeGatekeeperMiddleware from "./middlewares/gatekeeper";
import makeProxyMiddleware from "./middlewares/proxy";
import makeXPoweredByMiddleware from "./middlewares/x-powered-by";

export default class AppContext {
  public readonly config: Config;

  constructor(conf: Config) {
    this.config = Object.freeze(conf);
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
  public get gatekeeperMiddleware(): RequestHandler {
    return makeGatekeeperMiddleware({
      tokenParser: this.permissionParser,
    });
  }

  @Memoize()
  public get proxyMiddleware(): RequestHandler {
    return makeProxyMiddleware({
      logger: this.logger,
      target: this.config.TARGET_APP_URL,
      signStrategy: this.signStrategy,
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
  public get reyContract(): ReyContract {
    return new LocalReyContract(
      this.config.BLOCKCHAIN_NODE_URL,
      this.config.REY_CONTRACT_ADDRESS,
      { from: this.config.APP_ADDRESS},
    );
  }

  @Memoize()
  public get signStrategy(): SignStrategy {
    return EthPersonalSignStrategy(this.config.BLOCKCHAIN_NODE_URL,
                                   this.config.APP_ADDRESS,
                                   this.config.APP_ACCOUNT_PASSWORD);
  }
}
