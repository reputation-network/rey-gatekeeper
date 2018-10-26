import { RequestHandler } from "express";
import proxy from "http-proxy-middleware";
import https from "https";
import { ServerResponse } from "http";
import * as URL from "url";
import * as winston from "winston";
import { RequestEncryption } from "rey-sdk/dist/utils";

interface IProxyMiddlewareOptions {
  logger: winston.Logger;
  target: string;
}

export default function makeProxyMiddleware(opts: IProxyMiddlewareOptions): RequestHandler {
  return (req, res, next) => {
    const url = URL.parse(opts.target);
    const key: RequestEncryption.Key = res.locals.key;
    const proxyOptions: Partial<proxy.Config> = {
      logLevel: opts.logger.level as any,
      logProvider: () => opts.logger,
      target: `${url.protocol}//${url.host}`,
      auth: url.auth,
      xfwd: true,
      selfHandleResponse: true,
      onProxyRes: (proxyRes, req, res) => {
        let body = Buffer.from("");
        proxyRes.on("data", (data) => body = Buffer.concat([body, data]));
        proxyRes.on("end", () => finishResponse(res, body, key));
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
  }
}

function finishResponse(res: ServerResponse, body: Buffer, key: RequestEncryption.Key) {
  try {
    const output = JSON.parse(body.toString());
    const encryptedOutput = RequestEncryption.encryptBody(key, output);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(encryptedOutput));
  } catch(e) {
    console.error(e);
    res.statusCode = 502;
    res.end(e.toString());
  }
}
