import { RequestHandler } from "express";
import { ServerResponse } from "http";
import proxy from "http-proxy-middleware";
import https from "https";
import { SignStrategy } from "rey-sdk";
import { EncryptionKey } from "rey-sdk/dist/utils";
import * as URL from "url";
import * as winston from "winston";
import { encodeHeaderValue } from "./gatekeeper";

interface IProxyMiddlewareOptions {
  logger: winston.Logger;
  target: string;
  signStrategy: SignStrategy;
}

export default function makeProxyMiddleware(opts: IProxyMiddlewareOptions): RequestHandler {
  return (req, res, next) => {
    const url = URL.parse(opts.target);
    const key: EncryptionKey = res.locals.key;
    const proxyOptions: Partial<proxy.Config> = {
      logLevel: opts.logger.level as any,
      logProvider: () => opts.logger,
      target: `${url.protocol}//${url.host}`,
      auth: url.auth,
      xfwd: true,
      selfHandleResponse: true,
      onProxyRes: (proxyRes, _, res2) => {
        let body = Buffer.from("");
        proxyRes.on("data", (data) => body = Buffer.concat([body, data]));
        proxyRes.on("end", () => finishResponse(res2, body, key, opts.signStrategy, opts.logger));
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
function finishResponse(res: ServerResponse, body: Buffer, key: EncryptionKey, signStrategy: SignStrategy,
                        logger: winston.Logger) {
  res.setHeader("Content-Type", "application/json");
  (async () => {
    const output = JSON.parse(body.toString());
    const encryptedOutput = key.encrypt(output);
    const encryptedBody = JSON.stringify(encryptedOutput);
    const signature = await signStrategy(encryptedBody);
    res.setHeader("x-app-signature", encodeHeaderValue(signature));
    res.end(encryptedBody);
  })()
  .catch((e) => {
    logger.error(e);
    res.statusCode = 502;
    res.end(JSON.stringify({ error: e.toString() }));
  });
}
