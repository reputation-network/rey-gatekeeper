import { AppParams } from "rey-sdk";

export interface ITokenParser {
  parse(payload: string): Promise<AppParams>;
  verify(payload: string): Promise<AppParams>;
}

export { AppParams };
