import cors from "cors";
import express from "express";
import morgan from "morgan";
import Config from "./config";
import Context from "./context";

export default function makeGatekeeperServer(ctx: Context) {
  const app = express();
  app.use(morgan("combined", { stream: ctx.morganStream }));
  app.use(cors({ origin: true, methods: "GET,HEAD", credentials: true }));
  app.use(ctx.xPoweredByMiddleware);
  app.get("/healthcheck", ctx.healthcheckController);
  app.all(ctx.config.SECURED_PATH, ctx.gatekeeperMiddleware);
  app.post(ctx.config.CALLBACK_PATH, ctx.callbackMiddleware);
  app.use(ctx.proxyMiddleware);
  app.use(ctx.errorHandlerMiddleware);
  return app;
}

if (require.main === module) {
  const config = Config();
  const ctx = new Context(config);
  ctx.logger.debug(`Running with config: ${JSON.stringify(config, null, 2)}`);
  const app = makeGatekeeperServer(ctx);
  app.listen(config.PORT, (err: Error) => {
    if (err) {
      ctx.logger.error(err);
      process.exit(1);
    } else {
      ctx.logger.info(`Listening on port ${config.PORT}`);
    }
  });
}
