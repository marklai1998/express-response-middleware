import { ErrorRequestHandler, Request, RequestHandler, Response } from 'express'

declare global {
  namespace Express {
    interface Response {
      __isEnd?: boolean
    }
  }
}

export type Transform = (
  body: {},
  request: Request,
  response: Response
) => unknown | Promise<unknown>
export type TransformHeader = (
  request: Request,
  response: Response
) => unknown | Promise<unknown>
export type TransformChunk = (
  chunk: string | Buffer,
  encoding: string | null,
  request: Request,
  response: Response
) => void | string | Buffer

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  res
    .status(500)
    .set('content-language', 'en')
    .json({ message: err.message })
    .end()
  return res
}

export const jsonMiddleware =
  (fn: Transform): RequestHandler =>
  (req, res, next) => {
    const originalJsonFn = res.json
    const originalEnd = res.end

    res.json = function (this: Response, json) {
      const originalJson = json
      res.json = originalJsonFn

      if (res.headersSent) return res

      void (async () => {
        try {
          const result = await fn(json, req, res)

          res.end = originalEnd

          if (res.headersSent) return

          originalJsonFn.call(
            this,
            result === undefined ? originalJson : result
          )

          if (res.__isEnd) res.end()
        } catch (e) {
          res.end = originalEnd
          errorHandler(e, req, res, next)
        }
      })()

      res.end = function (this: Response) {
        res.__isEnd = true
        return res
      }

      return res
    }

    next()
  }

export const headersMiddleware =
  (fn: TransformHeader): RequestHandler =>
  (req, res, next) => {
    const originalEnd = res.end

    res.end = function (this: Response) {
      if (res.headersSent) return originalEnd.apply(this, arguments as any)

      void (async () => {
        try {
          await fn(req, res)

          res.end = originalEnd

          if (res.headersSent) return

          originalEnd.apply(this, arguments as any)

          if (res.__isEnd) res.end()
        } catch (e) {
          res.end = originalEnd
          errorHandler(e, req, res, next)
        }
      })()

      res.end = function (this: Response) {
        res.__isEnd = true
        return res
      }

      return res
    }

    next()
  }

export const writeMiddleware =
  (fn: TransformChunk): RequestHandler =>
  (req, res, next) => {
    const original = res.write

    res.write = function (this: Response, chunk) {
      if (res.writableEnded) return false

      try {
        let modifiedChunk = fn(
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
