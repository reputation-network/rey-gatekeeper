import { RequestHandler } from "express";

export default function makeHealthcheckController(): RequestHandler {
  return (req, res) => res.status(200).send("OK");
}
