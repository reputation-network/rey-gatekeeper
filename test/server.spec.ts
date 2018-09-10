import { expect } from "chai";
import * as express from "express";
import * as http from "http";
import * as sinon from "sinon";
import request from "supertest";
import { Config } from "../src/config";
import Context from "../src/context";
import makeGatekeeperServer from "../src/server";
import logger from "./_utils/logger";

function makeContext(conf: Partial<Config> = {}) {
  const ctx = new Context(Object.assign<Config, Partial<Config>>({
    ETH_NODE_URL: "http://localhost:8545",
    TARGET_URL: "http://localhost:1024",
    LOG_LEVEL: "info",
    ENABLE_HTTP_LOG: false,
    PORT: "8080",
    APP_ADDRESS: "0x31bb9d47bc8bf6422ff7dcd2ff53bc90f8f7b009",
    REY_CONTRACT_ADDRESS: "0x31bb9d47bc8bf6422ff7dcd2ff53bc90f8f7b009",
    MANIFEST_URL: "",
  }, conf));
  // Use the tests logger instead of the default one from the context
  Object.defineProperty(ctx, "logger", { get: () => logger });
  return ctx;
}

describe("Gatekeeper server", () => {
  // Setup a new server context each time
  let ctx: Context;
  beforeEach("setup context", () => {
    ctx = makeContext({ TARGET_URL: "http://localhost:1024" });
  });
  // Setup a spied target server for every test
  let targetServer: http.Server;
  let targetServerReqHandler: undefined|((req: http.IncomingMessage, res: http.ServerResponse) => void);
  let targetServerSpy: sinon.SinonSpy;
  beforeEach("setup target server with requestHandler", (done) => {
    targetServerReqHandler = undefined;
    targetServerSpy = sinon.spy((req: http.IncomingMessage, res: http.ServerResponse) => {
      if (targetServerReqHandler) {
        targetServerReqHandler(req, res);
      }
      res.end();
    });
    targetServer = new http.Server(targetServerSpy).listen(1024, done);
  });
  afterEach("close test target server", (done) => {
    targetServer.close(done);
  });
  // Setup a gatekeeper middleware that allows everything to pass through
  let gatekeeperMiddleware: express.RequestHandler & sinon.SinonStub;
  beforeEach("setup passthrough gatekeeper middleware", () => {
    gatekeeperMiddleware = sinon.stub().callsArg(2);
    sinon.stub(ctx, "gatekeeperMiddleware").get(() => gatekeeperMiddleware);
  });
  // Setup a error handler middleware that does nothing
  let errorHandlerMiddleware: express.ErrorRequestHandler & sinon.SinonStub;
  beforeEach("setup passthrough error handler middleware", () => {
    errorHandlerMiddleware = sinon.stub().callsArg(3);
    sinon.stub(ctx, "errorHandlerMiddleware").get(() => errorHandlerMiddleware);
    // This is necessary for express to know that errorHandlerMiddleware is an error handler
    Object.defineProperty(errorHandlerMiddleware, "length", { value: 4 });
  });

  it("makes requests pass through gatekeeper middleware", async () => {
    const gatekeeperServer = makeGatekeeperServer(ctx);
    await request(gatekeeperServer).get("/");
    expect(gatekeeperMiddleware.calledOnce).to.equal(true);
  });

  describe("when gatekeeper middleware causes an error", () => {
    beforeEach("setup faulty gatekeeper middleware", () => {
      gatekeeperMiddleware = sinon.stub().callsArgWith(2, new Error("Test Suite Error"));
    });

    it("makes requests pass through error handler", async () => {
      const gatekeeperServer = makeGatekeeperServer(ctx);
      await request(gatekeeperServer).get("/");
      expect(gatekeeperMiddleware.calledOnce).to.equal(true);
      expect(errorHandlerMiddleware.calledOnce).to.equal(true);
      expect(errorHandlerMiddleware).to.have.been.calledAfter(gatekeeperMiddleware);
    });
  });

  describe("when gatekeeper middleware doesn't cause an error", () => {
    it("proxies request to the target server", async () => {
      const gatekeeperServer = makeGatekeeperServer(ctx);
      await request(gatekeeperServer).get("/");
      expect(targetServerSpy).to.have.been.calledAfter(gatekeeperMiddleware);
    });

    it("returns the status code of the target server after proxing", async () => {
      targetServerReqHandler = (req, res) => res.statusCode = 201;
      const gatekeeperServer = makeGatekeeperServer(ctx);
      await request(gatekeeperServer).get("/").expect(201);
    });

    it("returns the body of the target server after proxing", async () => {
      targetServerReqHandler = (req, res) => {
        res.setHeader("content-type", "text/plain");
        res.write("Hello from target server");
      };
      const gatekeeperServer = makeGatekeeperServer(ctx);
      await request(gatekeeperServer)
        .get("/")
        .expect((res: request.Response) => {
          expect(res.text).to.equal("Hello from target server");
        });
    });
  });

  describe("when proxying to target server", () => {
    it("adds the auth section of the target url as authorization", async () => {
      const ctxWithTargetAuth = makeContext({ TARGET_URL: "http://user:pass@localhost:1024" });
      sinon.stub(ctxWithTargetAuth, "gatekeeperMiddleware").get(() => gatekeeperMiddleware);
      ctxWithTargetAuth.logger.silent = true;
      const gatekeeperServer = makeGatekeeperServer(ctxWithTargetAuth);
      await request(gatekeeperServer).get("/").expect(200);
      const req: http.IncomingMessage = targetServerSpy.getCall(0).args[0];
      expect(req.headers).to.haveOwnProperty("authorization")
        .which.equals(`Basic ${Buffer.from("user:pass").toString("base64")}`);
    });

    it("uses the path section from the target url as base url for requests", async () => {
      const ctxWithTargetPath = makeContext({ TARGET_URL: "http://localhost:1024/api/v3" });
      ctxWithTargetPath.logger.silent = true;
      sinon.stub(ctxWithTargetPath, "gatekeeperMiddleware").get(() => gatekeeperMiddleware);
      const gatekeeperServer = makeGatekeeperServer(ctxWithTargetPath);
      await request(gatekeeperServer).get("/me").expect(200);
      const req: http.IncomingMessage = targetServerSpy.getCall(0).args[0];
      expect(req.url).to.equal("/api/v3/me");
    });
  });
});
