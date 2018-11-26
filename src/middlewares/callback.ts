import * as express from "express";
import ReyContract from "rey-sdk/dist/contracts/rey";
import { Transaction } from "rey-sdk/dist/structs";
import * as winston from "winston";
import HttpError, { HttpStatus } from "../lib/errors/http-error";
import { isAddress } from "rey-sdk/dist/utils";

interface ICallbackMiddlewareOptions {
  contract: ReyContract;
  appAddress: string;
  appAccountPassword: string;
  logger: winston.Logger;
}

/**
 * Returns a new middleware function that checks for valid authorization header credentials
 * and checks the credentials agains the application permission parser.
 *
 * If authorization, parse or validation of the credentials fail, nex will be called with an
 * error
 */
export default function makeCallbackMiddleware(opts: ICallbackMiddlewareOptions): express.RequestHandler {
  return async function callbackMiddleware(req, res, next) {
    express.json()(req, res, async () => {
      try {
        const transaction = new Transaction(req.body);
        console.log(`Cashing out transaction: ${JSON.stringify(transaction)}`);
        (async () => {
          // FIXME: Implement retries
          opts.contract.cashout(opts.appAddress, opts.appAccountPassword, [transaction])
            .catch((err) => opts.logger.error(`Cashout error:\n${err}`));
        })();
        res.end();
        next();
      } catch (e) {
        next(e);
      }
    });
  };
}
