import ReyContract from "rey-sdk/dist/contracts/rey";
import Request from "rey-sdk/dist/structs/request";
import { validateRequest } from "rey-sdk/dist/utils/struct-validations";

export default class LocalReyContract extends ReyContract {
  public validateRequest(request: Request) {
    validateRequest(request);
    return super.validateRequest(request);
  }
}
