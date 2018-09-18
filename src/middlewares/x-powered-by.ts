import * as express from "express";

export default function makeXPoweredByMiddleware(): express.RequestHandler {
  return (req, res, next) => {
    res.setHeader("X-Powered-By", "REY Gatekeeper");
    next();
  };
}
