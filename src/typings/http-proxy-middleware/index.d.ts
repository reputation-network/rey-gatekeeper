import "http-proxy-middleware";

declare module "http-proxy-middleware" {
  interface Config {
    selfHandleResponse?: boolean;
  }
}
