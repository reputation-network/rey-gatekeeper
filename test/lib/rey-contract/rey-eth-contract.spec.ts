import { expect } from "chai";
import * as sinon from "sinon";
import Contract from "web3-eth-contract";
import { ReyEthContract } from "../../../src/lib/rey-contract";
import logger from "../../_utils/logger";
import { request } from "./_fixtures";

describe("ReyEthContract", () => {
  const contractAddress = "0x1234567890abcdef1234567890abcdef12345678";
  const appAddress = request.readPermission.source;
  const blockchainNodeUrl = "http://localhost:8545/";
  const makeReyEthContract = () => {
    return new ReyEthContract({ blockchainNodeUrl, logger, contractAddress, appAddress });
  };

  afterEach(() => {
    sinon.restore();
  });

  describe("new ReyEthContract(...)", () => {
    it("creates a new Web3#eth.Contract with the provided Ethereum Contract Address", () => {
      const reyContract = makeReyEthContract();
      const ethContract = (reyContract as any).contract;
      expect(ethContract).to.be.an.instanceof(Contract);
      expect(ethContract._address.toLowerCase()).to.be.equal(contractAddress);
      expect(ethContract._provider.host).to.be.equal(blockchainNodeUrl);
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
