import { expect } from "chai";
import * as sinon from "sinon";
import ReyContract from "../../../src/lib/rey-contract";
import { ParseError, VerifyError } from "../../../src/lib/rey-token-parser";
import ContractTokenParser from "../../../src/lib/rey-token-parser/contract-token-parser";
import logger from "../../_utils/logger";
import { appParams, validToken, wrongToken } from "./_fixtures";

describe("JwtEthPermissionParser", () => {
  let contract: sinon.SinonStubbedInstance<ReyContract>;
  let permissionParser: ContractTokenParser;
  before(() => {
    contract = sinon.createStubInstance(ReyContract);
    permissionParser = new ContractTokenParser({ contract, logger } as any);
  });

  describe("#parse", () => {
    it("returns the permission contents from the jwt", async () => {
      const tokenAppParams = await permissionParser.parse(validToken);
      // FIXME: Improve comparison
      expect(JSON.stringify(tokenAppParams)).to.equal(JSON.stringify(appParams));
    });
    it("throws ParseError if jwt cant be parsed", async () => {
      try {
        await permissionParser.parse("asdf.qwerty");
      } catch (e) {
        expect(e).to.be.an.instanceof(ParseError);
      }
    });
    it("throws ParseError if jwt has wrong payload format", async () => {
      try {
        await permissionParser.parse(wrongToken);
      } catch (e) {
        expect(e).to.be.an.instanceof(ParseError);
      }
    });
  });

  describe("#verify", () => {
    it("returns the permission contents from the jwt", async () => {
      const tokenAppParams = await permissionParser.verify(validToken);
      // FIXME: Improve comparison
      expect(JSON.stringify(tokenAppParams)).to.equal(JSON.stringify(appParams));
    });
    it("calls contract#validateRequest", async () => {
      await permissionParser.verify(validToken);
      expect(contract.validateRequest.called).to.equal(true);
    });
    it("calls contract#validateRequest with the formatted jwt content", async () => {
      await permissionParser.verify(validToken);
      expect(contract.validateRequest).to.have.been
        .calledWith(appParams.request);
    });
    it("throws ParseError if jwt cant be parsed", async () => {
      try {
        await permissionParser.parse("asdf.qwerty");
      } catch (e) {
        expect(e).to.be.an.instanceof(ParseError);
      }
    });
    it("throws VerifyError if contract throws any error", async () => {
      const error = new Error("I'm an error!");
      contract.validateRequest.rejects(error);
      try {
        await permissionParser.parse(validToken);
      } catch (e) {
        expect(e).to.be.an.instanceof(VerifyError);
        expect(e.message).to.equal(error);
      }
    });
  });
});
