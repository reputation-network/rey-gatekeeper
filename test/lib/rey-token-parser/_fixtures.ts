import JWT from "jsonwebtoken";
import { AppParams } from "rey-sdk";

export const appParams = new AppParams({
  request: {
    readPermission: {
      reader: `0x${"c".repeat(40)}`,
      source: `0x${"b".repeat(40)}`,
      subject: `0x${"a".repeat(40)}`,
      expiration: "1530000000",
      signature: [
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "0x1c",
      ],
    },
    session: {
      subject: `0x${"a".repeat(40)}`,
      verifier: `0x${"9".repeat(40)}`,
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
      expiration: "1530000000",
      signature: [
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "0x1c",
      ],
    },
  ],
});

export const validToken = JWT.sign({ ...appParams }, "", { algorithm: "none" });
export const wrongToken = JWT.sign({ ...appParams, request: undefined }, "", { algorithm: "none" });