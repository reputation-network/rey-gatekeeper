import { expect } from "chai";
import express from "express";
import http from "http";
import sinon from "sinon";
import request from "supertest";
import proxy from "../../src/middlewares/proxy";
import logger from "../_utils/logger";

describe("Proxy middleware", () => {
  let targetServerHandler: sinon.SinonSpy;
  let targetServer: http.Server;
  beforeEach("setup target server", (done) => {
    targetServerHandler = sinon.spy();
    targetServer = http.createServer((req, res) => {
      targetServerHandler(req, res);
      res.end();
    });
    targetServer.listen(1024, done);
  });
  afterEach("teardown server", (done) => targetServer.close(done));
  const createProxyServer = (target: string) => express().use(proxy({target, logger}));

  it("proxies request to the target server", async () => {
    const proxyServer = createProxyServer("http://localhost:1024");
    await request(proxyServer).get("/data");
    expect(targetServerHandler.calledOnce).to.equal(true);
    const req = targetServerHandler.getCall(0).args[0];
    expect(req.url).to.equal("/data");
  });

  it("ignores target.path when proxing a request to the target server", async () => {
    const proxyServer = createProxyServer("http://localhost:1024/api/1");
    await request(proxyServer).get("/data");
    expect(targetServerHandler.calledOnce).to.equal(true);
    const req = targetServerHandler.getCall(0).args[0];
    expect(req.url).to.equal("/data");
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
