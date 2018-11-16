import JWT from "jsonwebtoken";
import { AppParams, Proof } from "rey-sdk";
import { privateKeyFromSeed, privateKeyToAddress } from "../../utils";

export const verifierPrivateKey = privateKeyFromSeed("d");
export const verifierAddress = privateKeyToAddress(verifierPrivateKey);
export const readerPrivateKey = privateKeyFromSeed("c");
export const readerAddress = privateKeyToAddress(readerPrivateKey);
export const sourcePrivateKey = privateKeyFromSeed("b");
export const sourceAddress = privateKeyToAddress(sourcePrivateKey);
export const appParams = new AppParams({
  request: {
    readPermission: {
      reader: readerAddress,
      source: sourceAddress,
      subject: `0x${"a".repeat(40)}`,
      manifest: `0x${"d".repeat(64)}`,
      expiration: "1530000000",
      signature: [
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "0x1c",
      ],
    },
    session: {
      subject: `0x${"a".repeat(40)}`,
      verifier: verifierAddress,
      fee: 1000,
      nonce: 1531402911501,
      signature: [
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "0x1c",
      ],
    },
    value: "1000000000000000000",
    counter: 1,
    signature: [
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "0x1b",
    ],
  },
  extraReadPermissions: [
    {
      reader: `0x${"e".repeat(40)}`,
      source: `0x${"f".repeat(40)}`,
      subject: `0x${"a".repeat(40)}`,
      manifest: `0x${"d".repeat(64)}`,
      expiration: "1530000000",
      signature: [
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "0x1c",
      ],
    },
  ],
  encryptionKey: {
    publicKey: "-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAJtTffmmVumQi89aVYWoAzyEts4kiIhD\n" +
               "Zo7ZPmgVnaKV00qEmVfejQK6p6GTQ5jX3Vj+2jnmUkN9x0ce3PYRqScCAwEAAQ==\n-----END PUBLIC KEY-----",
    signature: [
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "0x1c",
    ],
  },
});

export const proof = new Proof({
  writePermission: {
    writer: appParams.request.readPermission.source,
    subject: appParams.request.readPermission.subject,
    signature: [
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "0x00",
    ],
  },
  session: appParams.request.session,
  signature: [
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x00",
  ],
});

export const validToken = JWT.sign({ ...appParams }, "", { algorithm: "none" });
export const wrongToken = JWT.sign({ ...appParams, request: undefined }, "", { algorithm: "none" });
