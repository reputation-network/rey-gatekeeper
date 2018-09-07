import { RequestHandler } from "express";
import { readFile } from "fs";
import proxy from "http-proxy-middleware";
import https from "https";
import URL from "url";
import { Logger } from "winston";

interface IManifestControllerOptions {
  logger: Logger;
  manifestUrl: string;
}

export default function makeHealthcheckController(): RequestHandler {
  return (req, res) => res.status(200).send("OK");
}
