import assert from "assert";
import Accounts from "web3-eth-accounts";
import { SignedEntity } from "rey-sdk/dist/types";
import { recoverSignatureSeed, reyHash, toRpcSignature } from "rey-sdk/dist/utils";

/**
 * Asserts that the provided signed entity is signed by the provided
 * signer
 * @param signed
 * @param signed
 */
export function assertSignature(signed: SignedEntity, signer: string) {
  const accounts = new Accounts();
  const msg = reyHash(recoverSignatureSeed(signed));
  const originalSigner = accounts.recover(msg, toRpcSignature(signed.signature));
  assert.equal(signer, originalSigner,
    `Expected signer ${signer} to equal original signer ${originalSigner}`);
}

/**
 * Returns a private key that consists of the repetition of the provided key
 * until 64 chars.
 * @param seed hex string to be used as repetition pattern
 */
export function privateKeyFromSeed(seed: string) {
  return `0x${new Array(64).fill(seed).join("").slice(0, 64)}`;
}

/**
 * Returns the public address for a given private key
 * @param pk
 */
export function privateKeyToAddress(pk: string) {
  const accounts = new Accounts();
  const account = accounts.privateKeyToAccount(pk);
  return account.address;
}
