import { expect } from "chai";
import * as sinon from "sinon";
import Web3 from "web3";
import { ReyEthContract } from "../../../src/lib/rey-contract";
import logger from "../../_utils/logger";
import { request } from "./_fixtures";

describe("ReyEthContract", () => {
  const contractAddress = "0x1234567890abcdef1234567890abcdef12345678";
  const appAddress = request.readPermission.source;
  const contractAbi = require("../../../src/lib/rey-contract/contract-abi.json");
  const web3 = new Web3("http://localhost:8545/");
  const makeReyEthContract = () => {
    return new ReyEthContract({ web3, logger, contractAddress, appAddress });
  };

  afterEach(() => {
    sinon.restore();
  });

  describe("new ReyEthContract(...)", () => {
    it("creates a new Web3#eth.Contract with the provided Ethereum Contract Address", () => {
      const EthContract = sinon.spy(web3.eth, "Contract");
      const reyContract = makeReyEthContract();
      expect(EthContract.calledWithNew()).to.equal(true);
      expect(EthContract).to.have.been.calledWith(contractAbi, contractAddress);
    });
  });

  describe("#validateRequest", () => {
    const reyContract = makeReyEthContract();
    let validateRequestStub: sinon.SinonStub;
    let validateRequestTransactionStub: Record<string, sinon.SinonStub>;

    beforeEach("stub validateRequest", () => {
      validateRequestTransactionStub = { call: sinon.stub() };
      // NOTE: (reyContract as any) allows us to access private stuff BUT without typechecking
      const methods = (reyContract as any).contract.methods;
      validateRequestStub = sinon.stub(methods, "validateRequest")
        .returns(validateRequestTransactionStub);
    });

    it("calls smart contract validateRequest method", async () => {
      await reyContract.validateRequest(request);
      expect(validateRequestStub.calledOnce).to.equal(true);
      expect(validateRequestTransactionStub.call.calledOnce).to.equal(true);
    });

    it("calls smart contract using accountAddres as from for the transaction", async () => {
      await reyContract.validateRequest(request);
      expect(validateRequestTransactionStub.call).to
        .have.been.calledWithMatch({ from: appAddress });
    });

    it("transforms the access request into abi before calling the smart contract", async () => {
      await reyContract.validateRequest(request);
      expect(validateRequestStub).to.have.been
        .calledWith(request.toABI());
    });

    it("rejects if the smart contract throws", async () => {
      const error = new Error("Im an error");
      validateRequestTransactionStub.call.rejects(error);
      try {
        await reyContract.validateRequest(request);
        expect.fail("Did not throw");
      } catch (e) {
        expect(e).to.be.an.instanceof(Error);
        expect(e.message).equal(error.message);
      }
    });
  });
});
