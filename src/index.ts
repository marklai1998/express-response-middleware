export * from "./endMiddleware.js";
export * from "./jsonMiddleware.js";
export * from "./jsonpMiddleware.js";
export * from "./writeMiddleware.js";

declare global {
  namespace Express {
    interface Response {
      __isEnd?: boolean;
    }
  }
}
