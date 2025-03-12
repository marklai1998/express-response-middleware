import { Request, RequestHandler, Response } from 'express'
import { errorHandler } from './utils/errorHandler'

export type TransformChunk = (
  chunk: string | Buffer,
  encoding: string | null,
  request: Request,
  response: Response
) => void | string | Buffer

// TODO: async support
// TODO: add docs about return type
export const writeMiddleware =
  (fn: TransformChunk): RequestHandler =>
  (req, res, next) => {
    const original = res.write

    res.write = function (this: Response, chunk) {
      try {
        const modifiedChunk = fn(
          chunk,
          // Since `encoding` is an optional argument to `res.write`,
          // make sure it is a string and not actually the callback.
          typeof arguments[1] === 'string' ? arguments[1] : null,
          req,
          res
        )

        if (res.writableEnded) return false

        arguments[0] = modifiedChunk === undefined ? chunk : modifiedChunk
        return original.apply(res, arguments as any)
      } catch (err) {
        errorHandler(err, req, res, next)
        return false
      }
    }

    next()
  }
