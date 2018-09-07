import { URL } from "url";

type Address = string;

export interface IReyManifest {
  version: string;
  name: string;
  description: string;
  address: Address;
  verifier_url: URL;
  verifier_fee: number;
  app_url: URL;
  app_reward: number;
  app_schema: string;
  app_dependencies: Address[];
}
