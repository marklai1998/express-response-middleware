import { Request, RequestHandler, Response } from 'express'
import { errorHandler } from './utils/errorHandler'

export type TransformChunk = (
  chunk: string | Buffer,
  encoding: string | null,
  request: Request,
  response: Response
) => void | string | Buffer | Promise<void> | Promise<string> | Promise<Buffer>

export const writeMiddleware =
  (fn: TransformChunk): RequestHandler =>
  (req, res, next) => {
    const originalWrite = res.write
    const originalEnd = res.end

    res.write = function (this: Response, chunk) {
      let mayBePromise
      try {
        mayBePromise = fn(
          chunk,
          // Since `encoding` is an optional argument to `res.write`,
          // make sure it is a string and not actually the callback.
          typeof arguments[1] === 'string' ? arguments[1] : null,
          req,
          res
        )
      } catch (e) {
        errorHandler(e, req, res, next)
        return false
      }

      if (mayBePromise instanceof Promise) {
        void (async () => {
          try {
            const result = await mayBePromise
            res.end = originalEnd

            if (res.writableEnded) return false

            arguments[0] = result === undefined ? chunk : result

            const writeResponse = originalWrite.apply(res, arguments as any)

            if (res.__isEnd) res.end()

            return writeResponse
          } catch (e) {
            errorHandler(e, req, res, next)
            return false
          }
        })()

        res.end = function (this: Response) {
          this.__isEnd = true
          return res
        }
        return false
      } else {
        const result = mayBePromise
        if (res.writableEnded) return false

        arguments[0] = result === undefined ? chunk : result
        return originalWrite.apply(res, arguments as any)
      }
    }

    next()
  }
