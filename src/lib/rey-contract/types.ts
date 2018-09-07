import { Request } from "rey-sdk";

export interface IReyContract {
  validateRequest(args: Request): Promise<void>;
}
