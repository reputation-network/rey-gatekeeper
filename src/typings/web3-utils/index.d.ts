declare module "web3-utils/src/soliditySha3" {
  type TV = { t: string, v: number | string }
  type TypeValue = { type: string, value: number | string }
  export default function soliditySha3(...args: Array<number | string | TV | TypeValue>): string;
}
