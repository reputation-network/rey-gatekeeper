declare module "web3-eth-accounts" {
  type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
  export interface Signature {
    message: string;
    messageHash: string;
    v: string;
    r: string;
    s: string;
    signature: string;
  }
  export interface Account {
    readonly address: string;
    readonly privateKey: string;
    sign: (data: string) => Signature;
  }
  export default class Accounts {
    constructor(provider?: any);
    public create(entropy?: string): Account;
    public privateKeyToAccount(privateKey: string): Account;
    public recover(signatureObject: Omit<Signature, "message">): string;
    public recover(message: string, signature: string, prefixed?: boolean): string;
    public recover(message: string, r: string, s: string, v: string, prefixed?: boolean): string;
  }
}
