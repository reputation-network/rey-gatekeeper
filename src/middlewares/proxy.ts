import proxy from "http-proxy-middleware";
import https from "https";
import path from "path";
import * as URL from "url";
import * as winston from "winston";

interface IProxyMiddlewareOptions {
  logger: winston.Logger;
  target: string;
}

export default function makeProxyMiddleware(opts: IProxyMiddlewareOptions) {
  const url = URL.parse(opts.target);
  const proxyOptions: Partial<proxy.Config> = {
    // logging options
    logLevel: "debug",
    logProvider: () => opts.logger,
    // Target settings
    auth: url.auth,
    target: `${url.protocol}//${url.host}`,
    pathRewrite: (p) => path.join(url.pathname || "", p),
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
