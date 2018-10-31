import * as express from "express";
import { normalizeSignature, recoverSignatureSeed, reyHash } from "rey-sdk/dist/utils";
import { EncryptionKey } from "rey-sdk/dist/utils";
import { validateSignature } from "rey-sdk/dist/utils/struct-validations";
import HttpError, { HttpStatus } from "../lib/errors/http-error";
import { AppParams, ITokenParser, ParseError, VerifyError } from "../lib/rey-token-parser";

interface IGatekeeperMiddlewareOptions {
  tokenParser: ITokenParser;
}

/**
 * Returns a new middleware function that checks for valid authorization header credentials
 * and checks the credentials agains the application permission parser.
 *
 * If authorization, parse or validation of the credentials fail, nex will be called with an
 * error
 */
export default function makeGatekeeperMiddleware(opts: IGatekeeperMiddlewareOptions): express.RequestHandler {
  return async function gatekeeperMiddleware(req, res, next) {
    try {
      const authHeader = parseAuthorizationHeader(req);
      const authCredentials = validateAuthorizationHeader(authHeader);
      const appParams = await opts.tokenParser.parse(authCredentials);
      await opts.tokenParser.verify(authCredentials);
      addXPermissionHeaders(appParams, req);
      addSessionHeader(appParams, req);
      addExtraReadPermissionsHeader(appParams, req);
      validateVerifierSignatureHeader(req, authCredentials, appParams);
      addEncryptionKey(appParams, req, res);
      // Remove the authorization header, so proxy middleware is able to add its authorization (if any)
      req.headers.authorization = "";
      next();
    } catch (e) {
      if (e instanceof HttpError) {
        next(e);
      } else if (e instanceof ParseError) {
        next(new HttpError(HttpStatus.BAD_REQUEST, e));
      } else if (e instanceof VerifyError) {
        next(new HttpError(HttpStatus.UNAUTHORIZED, e));
      } else {
        next(e);
      }
    }
  };
}

/**
 * Parses the authorization header and returns it as `[ schema, credentials ]`.
 * If no authorization header is present or its value has not a valid format,
 * null will be returned instead
 * @param req - Request to check and parse for authorization
 * @returns [schema, credentials]
 */
function parseAuthorizationHeader(req: express.Request): [string, string] | null {
  const auth = req.headers.authorization;
  if (!auth) {
    return null;
  }
  const blankIdx = auth.indexOf(" ");
  const schema = auth.slice(0, blankIdx).toLocaleLowerCase();
  const credentials = auth.slice(blankIdx + 1);
  if (!schema || !credentials) {
    return null;
  }
  return [schema, credentials];
}

/**
 * Returns a promise that resolves after the provided authorization header
 * strcuture is checked for valid authorization header format and values.
 * @param auth - Authorization header to check
 */
function validateAuthorizationHeader(auth: [string, string] | null): string {
  if (!auth) {
    throw new HttpError(HttpStatus.UNAUTHORIZED, "No Authorization provided");
  }
  const [schema, credentials] = auth;
  if (schema !== "bearer") {
    throw new HttpError(HttpStatus.UNAUTHORIZED, `Unkown Authorization schema: ${schema}`);
  }
  if (!credentials) {
    throw new HttpError(HttpStatus.UNAUTHORIZED, "No Authorization credentials provided");
  }
  return credentials;
}

/**
 * Adds the permission fields as custom headers to the request
 */
function addXPermissionHeaders(appParams: AppParams, req: express.Request) {
  const readPermission = appParams.request.readPermission;
  Object.assign(req.headers, {
    "x-permission-reader": encodeHeaderValue(readPermission.reader),
    "x-permission-source": encodeHeaderValue(readPermission.source),
    "x-permission-subject": encodeHeaderValue(readPermission.subject),
  });
}

function addSessionHeader(appParams: AppParams, req: express.Request) {
  const session = appParams.request.session;
  Object.assign(req.headers, {
    "x-session": encodeHeaderValue(session),
  });
}

function addExtraReadPermissionsHeader(appParams: AppParams, req: express.Request) {
  const extraReadPermissions = appParams.extraReadPermissions;
  Object.assign(req.headers, {
    "x-extra-read-permissions": encodeHeaderValue(extraReadPermissions),
  });
}

/*
 * Validates that the sender is the session's verifier
 */
function validateVerifierSignatureHeader(req: express.Request, authCredentials: string, appParams: AppParams) {
  const verifier = appParams.request.session.verifier;
  const signatureHeader = req.headers["x-verifier-signature"] as string|undefined;
  if (!signatureHeader) {
    throw new HttpError(HttpStatus.BAD_REQUEST, "No x-verifier-signature header was provided");
  }
  try {
    const signature = normalizeSignature(decodeHeaderValue(signatureHeader));
    validateSignature(reyHash([authCredentials]), signature, verifier);
  } catch {
    throw new HttpError(HttpStatus.UNAUTHORIZED, "Invalid x-verifier-signature");
  }
}

function addEncryptionKey(appParams: AppParams, req: express.Request, res: express.Response) {
  try {
    validateSignature(reyHash(recoverSignatureSeed(appParams.encryptionKey)),
                      appParams.encryptionKey.signature,
                      appParams.request.readPermission.reader);
  } catch {
    throw new HttpError(HttpStatus.UNAUTHORIZED, "Invalid encryption key");
  }
  res.locals.key = appParams.encryptionKey;
}

/**
 * Returns a header-safe value of the provided mixed value.
 * Encode: base64.generate(json.generate(value))
 * Decode: json.parse(base64.parse(encoded))
 * @param value
 */
export function encodeHeaderValue(value: any): string {
  return Buffer.from(JSON.stringify(value)).toString("base64");
}

/**
 * Returns a header-safe value of the provided mixed value.
 * Encode: base64.generate(json.generate(value))
 * Decode: json.parse(base64.parse(encoded))
 * @param value
 */
function decodeHeaderValue(value: any): string {
  return JSON.parse(Buffer.from(value, "base64").toString());
}
