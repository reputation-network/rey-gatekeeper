import { expect } from "chai";
import * as express from "express";
import * as http from "http";
import * as net from "net";
import * as sinon from "sinon";
import * as winston from "winston";
import HttpError from "../../src/lib/errors/http-error";
import makeErrorHandlerMiddleware from "../../src/middlewares/error-handler";

describe("Error Handler middleware", () => {
  const errorHandler: express.ErrorRequestHandler = makeErrorHandlerMiddleware({
    logger: winston.createLogger({
      silent: true,
      transports: [new winston.transports.Console()],
    }),
  });
  let req: express.Request;
  let res: express.Response;
  let next: express.NextFunction & sinon.SinonSpy;

  beforeEach("initialize req res", () => {
    req = new http.IncomingMessage(new net.Socket()) as express.Request;
    res = new http.ServerResponse(req) as express.Response;
    next = sinon.spy();
    Object.defineProperty(res, "status", { value: sinon.spy() });
    Object.defineProperty(res, "json", { value: sinon.spy() });
  });

  describe("when recieved error is an HttpError", () => {
    it("sets HttpError#statusCode as the response statusCode", () => {
      const err = new HttpError(403, "Test HttpError #1");
      errorHandler(err, req, res, next);
      expect(res.status).to.have.been.calledOnceWith(403);
    });
    it("sends a json containing the error message", () => {
      const err = new HttpError(403, "Test HttpError #2");
      errorHandler(err, req, res, next);
      expect(res.json).to.have.been.calledOnceWith({ error: err.message });
    });
  });

  describe("when recieved error is not an HttpError", () => {
    let processExit: sinon.SinonSpy;
    before("setup process.exit stub", () => {
      processExit = sinon.stub(process, "exit").returns(null);
    });
    after("restore process.exit", () => {
      processExit.restore();
    });

    it("causes the process to exit with code 1", () => {
      const error = new Error("I'm a test error");
      errorHandler(error, req, res, next);
      expect(process.exit).to.have.been.calledOnceWith(1);
    });
  });
});
