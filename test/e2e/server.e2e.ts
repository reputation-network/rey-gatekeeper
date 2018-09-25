import { expect } from "chai";
import request from "supertest";
import * as generateToken from "./_fixtures/generate-token";

describe("[E2E] Gatekeeper Server", function() {
  this.slow(250); // Setup the slow timer since we are on e2e tests

  const sutUrl = process.env.SUT_URL;

  before("check SUT_URL is available", () => {
    if (!sutUrl) {
      throw new Error("Missing env SUT_URL (subject under tests url");
    }
  });

  context("when token has wrong format", () => {
    it("responds with 400", async () => {
      const token = await generateToken.wrongFormat();
      return request(sutUrl)
        .get("/anything/score")
        .set("Authorization", `bearer ${token}`)
        .expect((res: request.Response) => {
          expect(res.status).to.equal(400);
          expect(res.header).to.haveOwnProperty("x-powered-by")
            .which.equals("REY Gatekeeper");
          expect(res.body).to.haveOwnProperty("error")
            .which.matches(/request.+missing.+session/);
        });
    });
  });

  context("when token has a valid format but has", () => {
    it("wrong session subject, responds with 401", async () => {
      const token = await generateToken.wrongSessionSubject();
      return request(sutUrl)
        .get("/anything/score")
        .set("Authorization", `bearer ${token}`)
        .expect((res: request.Response) => {
          expect(res.status).to.equal(401);
          expect(res.header).to.haveOwnProperty("x-powered-by")
            .which.equals("REY Gatekeeper");
          expect(res.body).to.haveOwnProperty("error")
            .which.matches(/session.+signature/);
        });
    });
    it("expired read permission, responds with 401", async () => {
      const token = await generateToken.expired();
      return request(sutUrl)
        .get("/anything/score")
        .set("Authorization", `bearer ${token}`)
        .expect((res: request.Response) => {
          expect(res.status).to.equal(401);
          expect(res.header).to.haveOwnProperty("x-powered-by")
            .which.equals("REY Gatekeeper");
          expect(res.body).to.haveOwnProperty("error")
            .which.matches(/readPermission.+expired/);
        });
    });
    it("bad readPermisison signature, responds with 401", async () => {
      const token = await generateToken.wrongSignedPermission();
      return request(sutUrl)
        .get("/anything/score")
        .set("Authorization", `bearer ${token}`)
        .expect((res: request.Response) => {
          expect(res.status).to.equal(401);
          expect(res.header).to.haveOwnProperty("x-powered-by")
            .which.equals("REY Gatekeeper");
          expect(res.body).to.haveOwnProperty("error")
            .which.matches(/invalid.+signature/i);
        });
    });
  });

  context("when token is valid", () => {
    let token: string;
    before("generate token", async () => {
      token = await generateToken.valid();
    });

    it("reach the target server", () => {
      return request(sutUrl)
        .get("/anything/score")
        .set("Authorization", `bearer ${token}`)
        .expect((res: request.Response) => {
          expect(res.status).to.equal(200);
        });
    });

    it("reaches the target server with the path specified on GateKeeper TARGET", () => {
      return request(sutUrl)
        .get("/anything/score")
        .set("Authorization", `bearer ${token}`)
        .expect((res: request.Response) => {
          // FIXME: We should compare against the TARGET_APP_URL that gatekeeper is using
          expect(res.body.url).to.match(/\/score$/);
        });
    });

    it("reaches the target server with the auth specified on GateKeeper TARGET", () => {
      return request(sutUrl)
        .get("/anything/score")
        .set("Authorization", `bearer ${token}`)
        .expect((res: request.Response) => {
          // FIXME: We should compare against the TARGET_APP_URL that gatekeeper is using
          expect(res.body.headers.Authorization).to
            .equal(`Basic ${Buffer.from("user:password").toString("base64")}`);
        });
    });
  });
});
