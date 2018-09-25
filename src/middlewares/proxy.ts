import proxy from "http-proxy-middleware";
import https from "https";
import * as URL from "url";
import * as winston from "winston";

interface IProxyMiddlewareOptions {
  logger: winston.Logger;
  target: string;
}

export default function makeProxyMiddleware(opts: IProxyMiddlewareOptions) {
  const url = URL.parse(opts.target);
  const proxyOptions: Partial<proxy.Config> = {
    logLevel: opts.logger.level as any,
    logProvider: () => opts.logger,
    target: `${url.protocol}//${url.host}`,
    auth: url.auth,
    xfwd: true,
  };
  if (url.protocol === "https:") {
    Object.assign(proxyOptions, {
      agent: https.globalAgent,
      headers: {
        host: url.host || "",
      },
    });
  }
  return proxy(proxyOptions);
}
