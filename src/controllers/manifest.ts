import { RequestHandler } from "express";
import { readFile } from "fs";
import proxy from "http-proxy-middleware";
import https from "https";
import URL from "url";
import { Logger } from "winston";
import HttpError from "../lib/errors/http-error";

interface IManifestControllerOptions {
  logger: Logger;
  manifestUrl: string;
}

export default function makeManifestController(opts: IManifestControllerOptions): RequestHandler {
  if (!opts.manifestUrl) {
    opts.logger.warn("No manifest url provided, gatekeeper will not serve the manifest");
    return (req, res, next) => next();
  }
  const url = URL.parse(opts.manifestUrl);
  if (url.protocol === "file:") {
    return fileManifestController(url.pathname || "", opts.logger);
  } else if (url.protocol === "http:" || url.protocol === "https:") {
    return httpManifestController(url, opts.logger);
  } else {
    throw new Error(`Unkown manifest protocol: ${url.protocol || null}`);
  }
}

export function fileManifestController(path: string, logger: Logger): RequestHandler {
  return (req, res, next) => {
    readFile(path, "utf8", (err, result) => {
      if (err) {
        logger.error(`Error while reading manifets file at ${path}: ${err}`);
        next(new HttpError(404, `Error reading the manifest file at '${path}': ${err.message || err}`));
      } else {
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.send(result);
      }
    });
  };
}

export function httpManifestController(url: URL.Url, logger: Logger): RequestHandler {
  const proxyOptions: Partial<proxy.Config> = {
    logLevel: logger.level as any,
    logProvider: () => logger,
    target: url.href,
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
