import type { Request, RequestHandler, Response } from 'express';
import { errorHandler } from './utils/errorHandler.js';

export type TransformChunk = (
  chunk: string | Buffer,
  encoding: string | null,
  request: Request,
  response: Response,
) => void | string | Buffer | Promise<void> | Promise<string> | Promise<Buffer>;

export const writeMiddleware =
  (fn: TransformChunk): RequestHandler =>
  (req, res, next) => {
    const originalWrite = res.write;
    const originalEndFn = res.end;

    res.write = function (this: Response, chunk) {
      if (res.writableEnded) return false;

      let mayBePromise: ReturnType<TransformChunk>;
      try {
        mayBePromise = fn(
          chunk,
          // Since `encoding` is an optional argument to `res.write`,
          // make sure it is a string and not actually the callback.
          // biome-ignore lint/style/noArguments: pass argument type
          typeof arguments[1] === 'string' ? arguments[1] : null,
          req,
          res,
        );
      } catch (e) {
        errorHandler(e, req, res, next);
        return false;
      }

      if (mayBePromise instanceof Promise) {
        mayBePromise
          .then((result) => {
            res.end = originalEndFn;

            if (res.writableEnded) return false;

            // biome-ignore lint/style/noArguments: pass argument type
            arguments[0] = result === undefined ? chunk : result;

            // biome-ignore lint/style/noArguments: pass argument type
            const writeResponse = originalWrite.apply(res, arguments as any);

            if (res.__isEnd) res.end();

            return writeResponse;
          })
          .catch((e) => {
            res.end = originalEndFn;
            errorHandler(e, req, res, next);
          });

        res.end = function (this: Response) {
          this.__isEnd = true;
          return res;
        };
        return false;
      }

      const result = mayBePromise;
      if (res.writableEnded) return false;

      // biome-ignore lint/style/noArguments: pass argument type
      arguments[0] = result === undefined ? chunk : result;

      // biome-ignore lint/style/noArguments: pass argument type
      return originalWrite.apply(res, arguments as any);
    };

    next();
  };
