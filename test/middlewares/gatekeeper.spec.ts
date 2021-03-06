import { expect } from "chai";
import * as express from "express";
import * as http from "http";
import * as net from "net";
import * as sinon from "sinon";
import HttpError from "../../src/lib/errors/http-error";
import { ContractTokenParser, ParseError, VerifyError } from "../../src/lib/rey-token-parser";
import gatekeeper from "../../src/middlewares/gatekeeper";
import { appParams, verifierAddress, verifierPrivateKey, readerPrivateKey } from "../lib/rey-token-parser/_fixtures";
import { AppParams } from "rey-sdk";
import { buildEncryptionKey } from "rey-sdk/dist/structs/factory";
import { EncryptionKey } from "rey-sdk/dist/utils";
import * as SignStrategy from "rey-sdk/dist/sign-strategies";

describe("Gatekeeper middleware", () => {
  const tokenParser = sinon.createStubInstance(ContractTokenParser);
  const gk: express.RequestHandler = gatekeeper({ tokenParser });
  let req: express.Request;
  let res: express.Response;
  let next: express.NextFunction & sinon.SinonSpy;
  let encryptionKey = new EncryptionKey();
  function encodeHeader(header: any) { return Buffer.from(JSON.stringify(header)).toString("base64"); }
  function provideAppParams(extra: any) {
    let appParams2 = new AppParams(JSON.parse(JSON.stringify(Object.assign({}, appParams, extra))));
    tokenParser.parse.resolves(appParams2);
    tokenParser.verify.resolves(appParams2);
  }

  before("initialize encryption key", async () => {
    await encryptionKey.createPair();
  });
  beforeEach("initialize req res", () => {
    req = new http.IncomingMessage(new net.Socket()) as express.Request;
    res = new http.ServerResponse(req) as express.Response;
    res.locals = {};
    next = sinon.spy();
  });
  beforeEach("prepare default stubs", async () => {
    provideAppParams({});
  });

  it("calls next with HttpError 401 if req has no authorization header", async () => {
    await gk(req, res, next);
    expect(next.calledOnce).to.equal(true);
    const error = next.getCall(0).args[0];
    expect(error).to.be.an.instanceof(HttpError);
    expect(error).to.haveOwnProperty("statusCode").which.equals(401);
  });
  it("calls next with HttpError 401 if req authorization header has schema but no credentials", async () => {
    req.headers.authorization = "qwerty ";
    await gk(req, res, next);
    expect(next.calledOnce).to.equal(true);
    const error = next.getCall(0).args[0];
    expect(error).to.be.an.instanceof(HttpError);
    expect(error).to.haveOwnProperty("statusCode").which.equals(401);
  });
  it("calls next with HttpError 401 if req authorization schema is unknown", async () => {
    req.headers.authorization = "not_bearer IM_AN_ACCESS_TOKEN";
    await gk(req, res, next);
    expect(next.calledOnce).to.equal(true);
    const error = next.getCall(0).args[0];
    expect(error).to.be.an.instanceof(HttpError);
    expect(error).to.haveOwnProperty("statusCode").which.equals(401);
  });
  it("calls next with HttpError 400 if token parser throws ParseError", async () => {
    req.headers.authorization = `bearer IM_AN_ACCESS_TOKEN`;
    tokenParser.parse.rejects(new ParseError("I'm a test ParseError"));
    await gk(req, res, next);
    expect(next.calledOnce).to.equal(true);
    const error = next.getCall(0).args[0];
    expect(error).to.be.an.instanceof(HttpError);
    expect(error).to.haveOwnProperty("statusCode").which.equals(400);
  });
  it("calls next with HttpError 401 if token parser throws VerifyError", async () => {
    req.headers.authorization = `bearer IM_AN_ACCESS_TOKEN`;
    tokenParser.parse.rejects(new VerifyError("I'm a test VerifyError"));
    await gk(req, res, next);
    expect(next.calledOnce).to.equal(true);
    const error = next.getCall(0).args[0];
    expect(error).to.be.an.instanceof(HttpError);
    expect(error).to.haveOwnProperty("statusCode").which.equals(401);
  });
  it("if token parser throws Error passes that error to next", async () => {
    req.headers.authorization = `bearer IM_AN_ACCESS_TOKEN`;
    const error = new Error("I'm a test Error");
    tokenParser.parse.rejects(error);
    await gk(req, res, next);
    expect(next).to.have.been.calledOnceWith(error);
  });
  it("calls next with HttpError 400 if token parser passes but there is no verifier signature", async () => {
    req.headers.authorization = `bearer IM_AN_ACCESS_TOKEN`;
    await gk(req, res, next);
    const error = next.getCall(0).args[0];
    expect(error).to.be.an.instanceof(HttpError);
    expect(error).to.haveOwnProperty("statusCode").which.equals(400);
  });
  it("calls next with HttpError 401 if token parser passes but has invalid verifier signature", async () => {
    req.headers.authorization = `bearer IM_AN_ACCESS_TOKEN`;
    const signature = await SignStrategy.privateKey(verifierPrivateKey)("whatever");
    req.headers['x-verifier-signature'] = encodeHeader(signature);
    await gk(req, res, next);
    const error = next.getCall(0).args[0];
    expect(error).to.be.an.instanceof(HttpError);
    expect(error).to.haveOwnProperty("statusCode").which.equals(401);
  });
  it("calls next with HttpError 401 if encryption key signature is not valid", async () => {
    const authCredentials = "IM_AN_ACCESS_TOKEN";
    req.headers.authorization = `bearer ${authCredentials}`;
    const signature = await SignStrategy.privateKey(verifierPrivateKey)(authCredentials);
    req.headers['x-verifier-signature'] = encodeHeader(signature);

    provideAppParams({ encryptionKey });

    await gk(req, res, next);
    const error = next.getCall(0).args[0];
    expect(error).to.be.an.instanceof(HttpError);
    expect(error).to.haveOwnProperty("statusCode").which.equals(401);
  });
  it("calls next with HttpError 401 if encryption key is missing", async () => {
    const authCredentials = "IM_AN_ACCESS_TOKEN";
    req.headers.authorization = `bearer ${authCredentials}`;
    const verifierSignature = await SignStrategy.privateKey(verifierPrivateKey)(authCredentials);
    req.headers['x-verifier-signature'] = encodeHeader(verifierSignature);
    provideAppParams({ encryptionKey: undefined });
    await gk(req, res, next);
    const error = next.getCall(0).args[0];
    expect(error).to.be.an.instanceof(HttpError);
    expect(error).to.haveOwnProperty("statusCode").which.equals(401);
  });

  describe("with valid authorization credentials, verifier signature, and encryption key", () => {
    beforeEach(async () => {
      const authCredentials = "IM_AN_ACCESS_TOKEN";
      req.headers.authorization = `bearer ${authCredentials}`;
      const verifierSignature = await SignStrategy.privateKey(verifierPrivateKey)(authCredentials);
      req.headers['x-verifier-signature'] = encodeHeader(verifierSignature);

      const signedEncryptionKey = await buildEncryptionKey(encryptionKey, SignStrategy.privateKey(readerPrivateKey));
      provideAppParams({ encryptionKey: signedEncryptionKey });
    });
    it("calls next with no error", async () => {
      await gk(req, res, next);
      expect(next.calledOnce).to.equal(true);
      expect(next.getCall(0).args[0]).to.equal(undefined);
    });
    it("adds the appParams.readPermission fields x-headers to the req", async () => {
      expect(req.headers).not.to.haveOwnProperty("x-permission-reader");
      expect(req.headers).not.to.haveOwnProperty("x-permission-source");
      expect(req.headers).not.to.haveOwnProperty("x-permission-subject");
      await gk(req, res, next);
      expect(req.headers).to.haveOwnProperty("x-permission-source")
        .which.equals(Buffer.from(JSON.stringify(appParams.request.readPermission.source)).toString("base64"));
      expect(req.headers).to.haveOwnProperty("x-permission-subject")
        .which.equals(Buffer.from(JSON.stringify(appParams.request.readPermission.subject)).toString("base64"));
      expect(req.headers).to.haveOwnProperty("x-permission-reader")
        .which.equals(Buffer.from(JSON.stringify(appParams.request.readPermission.reader)).toString("base64"));
    });
    it("adds the appParams.extraReadPermissions fields x-headers to the req", async () => {
      expect(req.headers).not.to.haveOwnProperty("x-extra-read-permissions");
      await gk(req, res, next);
      const expectedHeader = Buffer.from(JSON.stringify(appParams.extraReadPermissions)).toString("base64");
      expect(req.headers).to.haveOwnProperty("x-extra-read-permissions")
        .which.equals(expectedHeader);
    });
    it("injects public key to encrypt output", async () => {
      await gk(req, res, next);
      expect(res.locals.key.toJSON().publicKey).to.deep.equal(encryptionKey.toJSON().publicKey);
    });
  });
});
