import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, RequestHandler, Response } from "express";
import { errorHandler } from "./utils/errorHandler.js";

export type TransformJsonp<T = unknown, R = T> = (
  body: T,
  request: Request,
  response: Response,
) => R | Promise<R>;

const isInSend = new AsyncLocalStorage<boolean>();

export const jsonpMiddleware =
  <T = unknown>(fn: TransformJsonp<T>): RequestHandler =>
  (req, res, next) => {
    const originalJsonpFn = res.jsonp;
    const originalSendFn = res.send;

    res.send = function (this: Response) {
      return isInSend.run(true, () =>
        originalSendFn.apply(this, arguments as any),
      );
    };

    res.jsonp = function (this: Response, json) {
      const originalEndFn = res.end;

      if (res.headersSent) return res;

      let mayBePromise: T | Promise<T>;
      try {
        mayBePromise = fn(json, req, res);
      } catch (e) {
        res.json = originalJsonpFn;
        errorHandler(e, req, res, next);
        return res;
      }

      if (mayBePromise instanceof Promise) {
        mayBePromise
          .then((result) => {
            if (res.headersSent) return;
            res.end = originalEndFn;

            originalJsonpFn.call(this, result === undefined ? json : result);
          })
          .catch((e) => {
            res.jsonp = originalJsonpFn;
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

        originalJsonpFn.call(this, result === undefined ? json : result);
      }

      return res;
    };

    next();
  };
