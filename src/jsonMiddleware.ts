import { Request, RequestHandler, Response } from "express";
import { errorHandler } from "./utils/errorHandler.js";
import { isInSend } from "./utils/asyncLocalStorage.js";

export type TransformJson<T = {}> = (
  body: T,
  request: Request,
  response: Response,
) => unknown | Promise<unknown>;

export const jsonMiddleware =
  (fn: TransformJson): RequestHandler =>
  (req, res, next) => {
    const originalJsonFn = res.json;
    const originalSendFn = res.send;

    res.send = function (this: Response) {
      return isInSend.run(true, () =>
        originalSendFn.apply(this, arguments as any),
      );
    };

    res.json = function (this: Response, json) {
      const originalEndFn = res.end;

      if (res.headersSent) return res;

      let mayBePromise;
      try {
        mayBePromise = fn(json, req, res);
      } catch (e) {
        res.json = originalJsonFn;
        errorHandler(e, req, res, next);
        return res;
      }

      if (mayBePromise instanceof Promise) {
        mayBePromise
          .then((result) => {
            if (res.headersSent) return;
            res.end = originalEndFn;

            originalJsonFn.call(this, result === undefined ? json : result);
          })
          .catch((e) => {
            res.json = originalJsonFn;
            res.end = originalEndFn;
            errorHandler(e, req, res, next);
          });

        // Prevent end being called wile promise still running
        res.end = function (this: Response) {
          //  Res.send will call Res.end, when send is call inside the middleware, do it actually
          if (isInSend.getStore()) {
            originalEndFn.apply(this, arguments as any);
          }
          return res;
        };
      } else {
        const result = mayBePromise;

        if (res.headersSent) return res;

        originalJsonFn.call(this, result === undefined ? json : result);
      }

      return res;
    };

    next();
  };
