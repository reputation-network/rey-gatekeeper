import { expect } from "chai";
import * as express from "express";
import * as http from "http";
import * as sinon from "sinon";
import request from "supertest";
import { Config } from "../src/config";
import Context from "../src/context";
import gatekeeper from "../src/server";
import logger from "./_utils/logger";

function makeContext(conf: Partial<Config> = {}) {
  const ctx = new Context(Object.assign<Config, Partial<Config>>({
    BLOCKCHAIN_NODE_URL: "http://localhost:8545",
    TARGET_APP_URL: "http://localhost:1024",
    LOG_LEVEL: "info",
    ENABLE_HTTP_LOG: false,
    ENABLE_XFWD: true,
    PORT: "8080",
    APP_ADDRESS: "0x31bb9d47bc8bf6422ff7dcd2ff53bc90f8f7b009",
    APP_ACCOUNT_PASSWORD: "",
    REY_CONTRACT_ADDRESS: "0x31bb9d47bc8bf6422ff7dcd2ff53bc90f8f7b009",
    SECURED_PATH: "/data",
    CALLBACK_PATH: "/data/callback",
  }, conf));
  // Use the tests logger instead of the default one from the context
  Object.defineProperty(ctx, "logger", { get: () => logger });
  return ctx;
}

describe("Gatekeeper server", () => {

  it("makes all requests pass through proxyMiddleware", async () => {
    const ctx = makeContext();
    const proxyMiddleware = sinon.stub().callsArg(2);
    sinon.stub(ctx, "proxyMiddleware").get(() => proxyMiddleware);
    const gk = gatekeeper(ctx);
    await request(gk).get("/manifest");
    expect(proxyMiddleware.calledOnce).to.equal(true);
  });

  context("when requesting CALLBACK_PATH", () => {
    it("passes through callbackMiddleware", async () => {
      const ctx = makeContext();
      const proxyMiddleware = sinon.stub().callsArg(2);
      const callbackMiddleware = sinon.stub().callsArg(2);
      sinon.stub(ctx, "proxyMiddleware").get(() => proxyMiddleware);
      sinon.stub(ctx, "callbackMiddleware").get(() => callbackMiddleware);
      const gk = gatekeeper(ctx);
      await request(gk).post(ctx.config.CALLBACK_PATH);
      expect(callbackMiddleware.calledOnce).to.equal(true);
      expect(proxyMiddleware.calledOnce).to.equal(true);
      expect(callbackMiddleware).to.have.been.calledBefore(proxyMiddleware);
    });

    it("passes through errorHandlerMiddleware when callbackMiddleware throws", async () => {
      const ctx = makeContext();
      const callbackMiddleware = sinon.stub().callsArgWith(2, new Error("Test Suite Error"));
      const errorHandlerMiddleware = sinon.stub().callsArg(2);
      sinon.stub(ctx, "callbackMiddleware").get(() => callbackMiddleware);
      sinon.stub(ctx, "errorHandlerMiddleware").get(() => errorHandlerMiddleware);
      // The following line is necessary for express to take errorHandler as so
      Object.defineProperty(errorHandlerMiddleware, "length", { value: 4 });
      const gk = gatekeeper(ctx);
      await request(gk).post(ctx.config.CALLBACK_PATH);
      expect(callbackMiddleware.calledOnce).to.equal(true);
      expect(errorHandlerMiddleware.calledOnce).to.equal(true);
      expect(callbackMiddleware).to.have.been.calledBefore(errorHandlerMiddleware);
    });
  });

  context("when requesting SECURED_PATH", () => {
    it("passes through gatekeeperMiddleware", async () => {
      const ctx = makeContext();
      const proxyMiddleware = sinon.stub().callsArg(2);
      const gatekeeperMiddleware = sinon.stub().callsArg(2);
      sinon.stub(ctx, "proxyMiddleware").get(() => proxyMiddleware);
      sinon.stub(ctx, "gatekeeperMiddleware").get(() => gatekeeperMiddleware);
      const gk = gatekeeper(ctx);
      await request(gk).get(ctx.config.SECURED_PATH);
      expect(gatekeeperMiddleware.calledOnce).to.equal(true);
      expect(proxyMiddleware.calledOnce).to.equal(true);
      expect(gatekeeperMiddleware).to.have.been.calledBefore(proxyMiddleware);
    });

    it("passes through errorHandlerMiddleware when gatekeeperMiddleware throws", async () => {
      const ctx = makeContext();
      const gatekeeperMiddleware = sinon.stub().callsArgWith(2, new Error("Test Suite Error"));
      const errorHandlerMiddleware = sinon.stub().callsArg(2);
      sinon.stub(ctx, "gatekeeperMiddleware").get(() => gatekeeperMiddleware);
      sinon.stub(ctx, "errorHandlerMiddleware").get(() => errorHandlerMiddleware);
      // The following line is necessary for express to take errorHandler as so
      Object.defineProperty(errorHandlerMiddleware, "length", { value: 4 });
      const gk = gatekeeper(ctx);
      await request(gk).get(ctx.config.SECURED_PATH);
      expect(gatekeeperMiddleware.calledOnce).to.equal(true);
      expect(errorHandlerMiddleware.calledOnce).to.equal(true);
      expect(gatekeeperMiddleware).to.have.been.calledBefore(errorHandlerMiddleware);
    });
  });
});
