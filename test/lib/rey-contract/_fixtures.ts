import { Request } from "rey-sdk";

export const request = new Request({
  readPermission: {
    reader: "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf",
    source: "0xb593a7Da0342Ccf7e45aC3472029624D095c12e2",
    subject: "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf",
    expiration: 4689751718,
    signature: [
      "0xbdbd2939f1316ae18299a033d15c904df0de9f81d2ff31ade9e6e63396265d94",
      "0x019946255cd62adf4795ebe79c49cdf36e779a76700a355690493496b35e02e9",
      "0x1c",
    ],
  },
  session: {
    subject: "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf",
    verifier: "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf",
    fee: 0,
    nonce: 1536151718,
    signature: [
      "0xb0837e93df75076c706ee3cbce32d3e33cb1d01cbb55e26672532a9dbee7eb0c",
      "0x62dcf566d776150add43689cabfa69bf0c0664c23ef2939308bd24a1cbfb8fb3",
      "0x1c",
    ],
  },
  counter: 1536151718862,
  value: 0,
  signature: [
    "0x67ce921c4700b086a80ca6ec0fb9847b72a8bb7930c6ec14a883d3b333f4104c",
    "0x452e4bd12034b740b0c2b402b1bc830e31671a9729f38d006fc109f5fb4f938c",
    "0x1b",
  ],
});
