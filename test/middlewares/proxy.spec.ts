import { expect } from "chai";
import express from "express";
import http from "http";
import sinon from "sinon";
import request from "supertest";
import proxy from "../../src/middlewares/proxy";
import logger from "../_utils/logger";
import { RequestEncryption } from "rey-sdk/dist/utils";

describe("Proxy middleware", () => {
  let targetServerHandler: sinon.SinonSpy;
  let targetServer: http.Server;
  let localsMiddleware: express.RequestHandler;
  const body = { some: "value" };
  beforeEach("setup target server", (done) => {
    localsMiddleware = (req, res, next) => { next(); };
    targetServerHandler = sinon.spy();
    targetServer = http.createServer((req, res) => {
      targetServerHandler(req, res);
      res.end(JSON.stringify(body));
    });
    targetServer.listen(1024, done);
  });
  afterEach("teardown server", (done) => targetServer.close(done));
  const createProxyServer = (target: string) => express().use(localsMiddleware).use(proxy({target, logger}));

  it("proxies request to the target server", async () => {
    const proxyServer = createProxyServer("http://localhost:1024");
    const response = await request(proxyServer).get("/data");
    expect(targetServerHandler.calledOnce).to.equal(true);
    const req = targetServerHandler.getCall(0).args[0];
    expect(req.url).to.equal("/data");
  });

  it("ignores target.path when proxying a request to the target server", async () => {
    const proxyServer = createProxyServer("http://localhost:1024/api/1");
    await request(proxyServer).get("/data");
    expect(targetServerHandler.calledOnce).to.equal(true);
    const req = targetServerHandler.getCall(0).args[0];
    expect(req.url).to.equal("/data");
  });

  it("encrypts target's response when a public key is given", async () => {
    const key = await RequestEncryption.createKey();
    localsMiddleware = (req, res, next) => {
      res.locals.key = key;
      next();
    }
    const proxyServer = createProxyServer("http://localhost:1024/api/1");
    const response = await request(proxyServer).get("/data");
    expect(targetServerHandler.calledOnce).to.equal(true);
    const req = targetServerHandler.getCall(0).args[0];
    expect(req.url).to.equal("/data");
    expect(RequestEncryption.decryptBody(key, response.body)).to.eql(body);
  });

  context("when target has auth", () => {
    it("passes the auth as basic authorization", async () => {
      const proxyServer = createProxyServer("http://user:secret@localhost:1024");
      await request(proxyServer).get("/data");
      expect(targetServerHandler.calledOnce).to.equal(true);
      const req = targetServerHandler.getCall(0).args[0];
      expect(req.headers).to.have.ownProperty("authorization")
        .which.includes(Buffer.from("user:secret").toString("base64"));
    });
  });
});
