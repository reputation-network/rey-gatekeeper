import { expect } from "chai";
import * as express from "express";
import * as http from "http";
import * as net from "net";
import * as sinon from "sinon";
import HttpError from "../../src/lib/errors/http-error";
import callback from "../../src/middlewares/callback";
import ReyContract from "rey-sdk/dist/contracts/rey";
import { Transaction } from "rey-sdk/dist/structs";
import { appParams, proof } from "../lib/rey-token-parser/_fixtures";

describe("Callback middleware", () => {
  const appAddress = appParams.request.readPermission.source;
  const contract = sinon.createStubInstance(ReyContract) as any;
  const cb: express.RequestHandler = callback({ appAddress, contract });
  let req: express.Request;
  let res: express.Response;
  let next: express.NextFunction & sinon.SinonSpy;

  beforeEach("initialize req res", () => {
    req = new http.IncomingMessage(new net.Socket()) as express.Request;
    res = new http.ServerResponse(req) as express.Response;
    next = sinon.spy();
  });

  it("posts transaction", async () => {
    req.body = JSON.stringify({ request: appParams.request, proof, signature: proof.signature });
    await cb(req, res, next);
    expect(next.calledOnce).to.equal(true);
    const error = next.getCall(0).args[0];
    expect(error).to.equal(undefined)
    const address = contract.cashout.getCall(0).args[0];
    expect(address).to.deep.equal(appAddress);
    const transactions = contract.cashout.getCall(0).args[1];
    expect(JSON.stringify(transactions)).to.deep.equal(`[${req.body}]`);
  });
});
