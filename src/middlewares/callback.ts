import * as express from "express";
import ReyContract from "rey-sdk/dist/contracts/rey";
import { Transaction } from "rey-sdk/dist/structs";
import HttpError, { HttpStatus } from "../lib/errors/http-error";

interface ICallbackMiddlewareOptions {
  contract: ReyContract;
  appAddress: string;
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
    express.json()(req, res, () => {
      try {
        const transaction = new Transaction(req.body);
        // FIXME: Implement retries
        opts.contract.cashout(opts.appAddress, [transaction]);
        res.end();
        next();
      } catch (e) {
        next(e);
      }
    });
  };
}