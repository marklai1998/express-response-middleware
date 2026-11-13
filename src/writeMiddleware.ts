import { AsyncLocalStorage } from 'node:async_hooks';
import { Transform } from 'node:stream';
import type { Request, RequestHandler, Response } from 'express';
import { errorHandler } from './utils/errorHandler.js';

export type TransformChunk = (
  chunk: string | Buffer,
  encoding: string | null,
  request: Request,
  response: Response,
) => void | string | Buffer | Promise<void> | Promise<string> | Promise<Buffer>;

type Callback = (error?: Error | null) => void;
type AnyFn = (...args: unknown[]) => unknown;

export const writeMiddleware =
  (fn: TransformChunk): RequestHandler =>
  (req, res, next) => {
    const originalWrite = res.write;
    const originalEnd = res.end;
    const callWrite = (args: unknown[]) =>
      (originalWrite as AnyFn).apply(res, args) as boolean;
    const callEnd = (args: unknown[]) =>
      (originalEnd as AnyFn).apply(res, args);
    // Calls to res.write / res.end made from inside `fn` (e.g. `res.json()`)
    // must bypass the transform, otherwise they would be queued behind the
    // chunk currently being transformed.
    const inTransform = new AsyncLocalStorage<boolean>();
    let endCallback: Callback | undefined;

    const transform = new Transform({
      decodeStrings: false,
      transform(chunk: string | Buffer, encoding: string, callback) {
        const stringEncoding =
          encoding === 'buffer' ? null : (encoding as BufferEncoding);
        // Only `fn` runs inside the bypass context. push/callback must run
        // outside it: they can synchronously trigger more writes (e.g. via
        // 'drain'), and those writes must go through the transform.
        inTransform
          .run(true, async () => fn(chunk, stringEncoding, req, res))
          .then(
            (result) => {
              const output = result === undefined ? chunk : result;
              if (typeof output === 'string' && stringEncoding)
                this.push(output, stringEncoding);
              else this.push(output);
              callback();
            },
            (e) => callback(e),
          );
      },
    });

    transform.on('data', (chunk: Buffer) => {
      if (res.writableEnded) return;
      // The transformed body length is unknown, fall back to chunked encoding
      if (!res.headersSent) res.removeHeader('Content-Length');
      if (!callWrite([chunk])) transform.pause();
    });
    res.on('drain', () => transform.resume());
    // Let upstream writers (e.g. another writeMiddleware) know they can resume
    transform.on('drain', () => res.emit('drain'));

    transform.on('end', () => {
      if (res.writableEnded) return;
      callEnd(endCallback ? [endCallback] : []);
    });

    transform.on('error', (e) => {
      res.write = originalWrite;
      res.end = originalEnd;
      if (res.headersSent) res.destroy(e);
      else errorHandler(e, req, res, next);
    });

    res.on('close', () => {
      if (!transform.destroyed) transform.destroy();
    });

    res.write = function (this: Response, chunk: unknown, ...args: unknown[]) {
      if (inTransform.getStore()) return callWrite([chunk, ...args]);
      if (transform.writableEnded || res.writableEnded) return false;

      const encoding = typeof args[0] === 'string' ? args[0] : undefined;
      const callback = (typeof args[0] === 'function' ? args[0] : args[1]) as
        | Callback
        | undefined;

      return transform.write(chunk, encoding as BufferEncoding, callback);
    } as Response['write'];

    res.end = function (this: Response, ...args: unknown[]) {
      if (inTransform.getStore()) return callEnd(args);
      if (transform.writableEnded || res.writableEnded) return res;

      const [chunk, encoding, callback] =
        typeof args[0] === 'function'
          ? [undefined, undefined, args[0]]
          : typeof args[1] === 'function'
            ? [args[0], undefined, args[1]]
            : args;
      endCallback = callback as Callback | undefined;

      if (chunk != null) transform.end(chunk, encoding as BufferEncoding);
      else transform.end();
      return res;
    } as Response['end'];

    next();
  };
