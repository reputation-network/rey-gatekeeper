import { expect } from "chai";
import * as express from "express";
import * as http from "http";
import * as net from "net";
import * as sinon from "sinon";
import logger from "../_utils/logger";
import HttpError from "../../src/lib/errors/http-error";
import callback from "../../src/middlewares/callback";
import ReyContract from "rey-sdk/dist/contracts/rey";
import { Transaction } from "rey-sdk/dist/structs";
import { appParams, proof } from "../lib/rey-token-parser/_fixtures";

describe("Callback middleware", () => {
  const contract = sinon.createStubInstance(ReyContract) as any;
  const appAddress = appParams.request.readPermission.source;
  const appAccountPassword = "whateverpassword1234";
  const cb: express.RequestHandler = callback({ contract, appAddress, appAccountPassword, logger });
  let req: express.Request;
  let res: express.Response;
  let next: express.NextFunction & sinon.SinonSpy;

  beforeEach("initialize req res", () => {
    req = new http.IncomingMessage(new net.Socket()) as express.Request;
    res = new http.ServerResponse(req) as express.Response;
    next = sinon.spy();
    contract.cashout.resolves();
  });

  it("posts transaction", async () => {
    req.body = { request: appParams.request, proof, signature: proof.signature };
    await cb(req, res, next);
    expect(next.calledOnce).to.equal(true);
    const error = next.getCall(0).args[0];
    expect(error).to.equal(undefined)
    const address = contract.cashout.getCall(0).args[0];
    expect(address).to.deep.equal(appAddress);
    const password = contract.cashout.getCall(0).args[1];
    expect(password).to.deep.equal(appAccountPassword);
    const transactions = contract.cashout.getCall(0).args[2];
    expect(JSON.stringify(transactions)).to.deep.equal(`[${JSON.stringify(req.body)}]`);
  });
});
