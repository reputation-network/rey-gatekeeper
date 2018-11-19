import { expect } from "chai";
import express from "express";
import http from "http";
import sinon from "sinon";
import request from "supertest";
import proxy from "../../src/middlewares/proxy";
import logger from "../_utils/logger";
import { EncryptionKey } from "rey-sdk/dist/utils";
import * as SignStrategy from "rey-sdk/dist/sign-strategies";
import { sourceAddress, sourcePrivateKey, appParams, proof } from "../lib/rey-token-parser/_fixtures";
import { validateSignature } from "rey-sdk/dist/utils/struct-validations"
import { normalizeSignature, reyHash } from "rey-sdk/dist/utils"

describe("Proxy middleware", () => {
  let targetServerHandler: sinon.SinonSpy;
  let targetServer: http.Server;
  let localsMiddleware: express.RequestHandler;
  let body: string;
  let writePermissionHeader: string|undefined;
  let proofHeader: string|undefined;
  beforeEach("setup target server", (done) => {
    body = JSON.stringify({ some: "value" });
    localsMiddleware = (req, res, next) => { next(); };
    targetServerHandler = sinon.spy();
    writePermissionHeader = undefined;
    proofHeader = undefined;
    targetServer = http.createServer((req, res) => {
      targetServerHandler(req, res);
      if (writePermissionHeader) { res.setHeader("x-write-permission", writePermissionHeader); }
      if (proofHeader) { res.setHeader("x-proof", proofHeader); }
      res.end(body);
    });
    targetServer.listen(1024, done);
  });
  const enableXfwd = true;
  const signStrategy = SignStrategy.privateKey(sourcePrivateKey);
  afterEach("teardown server", (done) => targetServer.close(done));
  const createProxyServer = (target: string) =>
    express().use(localsMiddleware)
      .use(proxy({target, logger, signStrategy, enableXfwd}));

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

  context("with no write permission header nor proof header", async () => {
    it("returns a not found error", async () => {
      const key = new EncryptionKey();
      await key.createPair();
      localsMiddleware = (req, res, next) => {
        res.locals.key = key;
        next();
      }
      const proxyServer = createProxyServer("http://localhost:1024/api/1");
      const response = await request(proxyServer).get("/data");
      expect(targetServerHandler.calledOnce).to.equal(true);
      const req = targetServerHandler.getCall(0).args[0];
      expect(req.url).to.equal("/data");
      expect(response.status).to.equal(404);
      expect(response.body).to.deep.equal({ error: "No data found for subject" });
    });
  });

  const itBehavesLikeProxyingResponse = () => {
    it("encrypts target's response", async () => {
      const key = new EncryptionKey();
      await key.createPair();
      localsMiddleware = (req, res, next) => {
        res.locals.key = key;
        res.locals.session = appParams.request.session;
        next();
      }
      const proxyServer = createProxyServer("http://localhost:1024/api/1");
      const response = await request(proxyServer).get("/data");
      expect(targetServerHandler.calledOnce).to.equal(true);
      const req = targetServerHandler.getCall(0).args[0];
      expect(req.url).to.equal("/data");
      expect(response.status).to.equal(200);
      expect(key.decrypt(response.body)).to.deep.equal(JSON.parse(body));
    });

    it("returns an error if body is not valid json", async () => {
      body = "this is just not json";
      const key = new EncryptionKey();
      await key.createPair();
      localsMiddleware = (req, res, next) => {
        res.locals.key = key;
        res.locals.session = appParams.request.session;
        next();
      }
      const proxyServer = createProxyServer("http://localhost:1024/api/1");
      const response = await request(proxyServer).get("/data");
      expect(targetServerHandler.calledOnce).to.equal(true);
      const req = targetServerHandler.getCall(0).args[0];
      expect(req.url).to.equal("/data");
      expect(response.status).to.equal(502);
      expect(response.body).to.have.property("error");
    });

    it("signs target's response", async () => {
      const key = new EncryptionKey();
      await key.createPair();
      localsMiddleware = (req, res, next) => {
        res.locals.key = key;
        res.locals.session = appParams.request.session;
        next();
      }
      const proxyServer = createProxyServer("http://localhost:1024/api/1");
      const response = await request(proxyServer).get("/data");
      expect(targetServerHandler.calledOnce).to.equal(true);
      expect(response.status).to.equal(200);
      const req = targetServerHandler.getCall(0).args[0];
      const signature = JSON.parse(Buffer.from(response.header['x-app-signature'], "base64").toString());
      validateSignature(reyHash([response.body]), normalizeSignature(signature), sourceAddress);
    });

    context("when target has auth", () => {
      it("passes the auth as basic authorization", async () => {
        const proxyServer = createProxyServer("http://user:secret@localhost:1024");
        const response = await request(proxyServer).get("/data");
        expect(response.status).to.equal(200);
        expect(targetServerHandler.calledOnce).to.equal(true);
        const req = targetServerHandler.getCall(0).args[0];
        expect(req.headers).to.have.ownProperty("authorization")
          .which.includes(Buffer.from("user:secret").toString("base64"));
      });
    });
  };

  context("with proof header", async () => {
    beforeEach(() => {
      proofHeader = Buffer.from(JSON.stringify(proof)).toString("base64");
    });
    itBehavesLikeProxyingResponse();
  });

  context("with write permission header", async () => {
    beforeEach(() => {
      writePermissionHeader = Buffer.from(JSON.stringify(proof.writePermission)).toString("base64");
    });
    itBehavesLikeProxyingResponse();
  });
});
