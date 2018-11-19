import { RequestHandler } from "express";
import { IncomingMessage, ServerResponse } from "http";
import proxy from "http-proxy-middleware";
import https from "https";
import { SignStrategy } from "rey-sdk";
import { Session } from "rey-sdk/dist/structs";
import { buildProof } from "rey-sdk/dist/structs/factory";
import { EncryptionKey } from "rey-sdk/dist/utils";
import * as URL from "url";
import * as winston from "winston";
import HttpError, { HttpStatus } from "../lib/errors/http-error";
import { encodeHeaderValue } from "./gatekeeper";

interface IProxyMiddlewareOptions {
  logger: winston.Logger;
  target: string;
  signStrategy: SignStrategy;
  enableXfwd: boolean;
}

function returnAppError(res: ServerResponse, err: Error, logger: winston.Logger) {
  logger.error(err);
  res.statusCode = 502;
  if (err instanceof HttpError) {
    res.statusCode = err.statusCode;
  }
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: err.message }));
}

export default function makeProxyMiddleware(opts: IProxyMiddlewareOptions): RequestHandler {
  return (req, res, next) => {
    const url = URL.parse(opts.target);
    const key: EncryptionKey = res.locals.key;
    const session: Session = res.locals.session;
    const proxyOptions: Partial<proxy.Config> = {
      logLevel: opts.logger.level as any,
      logProvider: () => opts.logger,
      target: `${url.protocol}//${url.host}`,
      auth: url.auth,
      xfwd: opts.enableXfwd,
      selfHandleResponse: true,
      onProxyRes: (proxyRes, _, res2) => {
        let body = Buffer.from("");
        proxyRes.on("data", (data) => body = Buffer.concat([body, data]));
        proxyRes.on("end", () => finishResponse(res2, body, key, session, proxyRes, opts.signStrategy, opts.logger));
      },
    };
    if (!key) {
      delete proxyOptions.selfHandleResponse;
      delete proxyOptions.onProxyRes;
    }
    if (url.protocol === "https:") {
      Object.assign(proxyOptions, {
        agent: https.globalAgent,
        headers: {
          host: url.host || "",
        },
      });
    }
    proxy(proxyOptions)(req, res, next);
  };
}

/**
 * Finish submitting the response by encrypting the output and signing the body
 */
function finishResponse(res: ServerResponse, body: Buffer, key: EncryptionKey, session: Session,
                        proxyRes: IncomingMessage, signStrategy: SignStrategy, logger: winston.Logger) {
  res.setHeader("Content-Type", "application/json");
  (async () => {
    await buildProofHeader(proxyRes, res, session, signStrategy);

    const output = JSON.parse(body.toString());
    const encryptedOutput = key.encrypt(output);
    const encryptedBody = JSON.stringify(encryptedOutput);

    const signature = await signStrategy(encryptedBody);
    res.setHeader("x-app-signature", encodeHeaderValue(signature));
    res.end(encryptedBody);
  })()
  .catch((e) => {
    returnAppError(res, e, logger);
  });
}

/*
 * Includes proof header in response
 */
async function buildProofHeader(proxyRes: IncomingMessage, res: ServerResponse, session: Session,
                                signStrategy: SignStrategy) {
  const writePermissionHeader = proxyRes.headers["x-write-permission"];
  const proofHeader = proxyRes.headers["x-proof"];
  if (proofHeader) {
    res.setHeader("x-proof", proofHeader);
  } else if (writePermissionHeader) {
    const writePermission = JSON.parse(Buffer.from(writePermissionHeader as string, "base64").toString());
    const proof = await buildProof({ writePermission, session }, signStrategy);
    res.setHeader("x-proof", encodeHeaderValue(proof));
  } else {
    throw new HttpError(HttpStatus.NOT_FOUND, "No data found for subject");
  }
}
