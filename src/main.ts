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
) => unknown
export type TransformAsync = (
  body: {},
  request: Request,
  response: Response
) => Promise<unknown>
export type TransformHeader = (request: Request, response: Response) => unknown
export type TransformHeaderAsync = (
  request: Request,
  response: Response
) => Promise<unknown>
export type TransformChunk = (
  chunk: string | Buffer,
  encoding: string | null,
  request: Request,
  response: Response
) => void | string | Buffer

export type Options = {
  runOnError?: boolean
}

const isScalar = (v: unknown) => {
  return typeof v !== 'object' && !Array.isArray(v)
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  res
    .status(500)
    .set('content-language', 'en')
    .json({ message: err.message })
    .end()
  return res
}

export const json =
  (fn: Transform, { runOnError }: Options = {}): RequestHandler =>
  (req, res, next) => {
    const originalJsonFn = res.json

    res.json = function (this: Response, json) {
      const originalJson = json
      res.json = originalJsonFn

      if (res.headersSent) return res

      if (!runOnError && res.statusCode >= 400)
        return originalJsonFn.call(this, json)

      try {
        let result = fn(json, req, res)

        if (res.headersSent) return res

        // If no returned value from fn, then assume json has been mucked with.
        if (result === undefined) result = originalJson

        // If null, then 204 No Content
        if (result === null) return res.status(204).end()

        // If munged scalar value, then text/plain
        if (originalJson !== result && isScalar(result)) {
          res.set('content-type', 'text/plain')
          return res.send(String(result))
        }

        return originalJsonFn.call(this, result)
      } catch (e) {
        errorHandler(e, req, res, next)
        return res
      }
    }

    next()
  }

export const jsonAsync =
  (fn: TransformAsync, { runOnError }: Options = {}): RequestHandler =>
  (req, res, next) => {
    const originalJsonFn = res.json
    const originalEnd = res.end

    res.json = function (this: Response, json) {
      const originalJson = json
      res.json = originalJsonFn

      if (res.headersSent) return res

      if (!runOnError && res.statusCode >= 400)
        return originalJsonFn.call(this, json)

      try {
        fn(json, req, res)
          .then(result => {
            res.end = originalEnd

            if (res.headersSent) return

            // If no returned value from fn, then assume json has been mucked with.
            if (result === undefined) result = originalJson

            // If null, then 204 No Content
            if (result === null) {
              res.status(204).end()
              return
            }

            // If munged scalar value, then text/plain
            if (result !== originalJson && isScalar(result)) {
              res.set('content-type', 'text/plain')
              res.send(String(result))
              return
            }

            originalJsonFn.call(this, result)

            if (res.__isEnd) res.end()

            return
          })
          .catch(e => {
            res.end = originalEnd
            errorHandler(e, req, res, next)
          })
      } catch (e) {
        res.end = originalEnd
        errorHandler(e, req, res, next)
        return res
      }

      res.end = function (this: Response) {
        res.__isEnd = true
        return res
      }

      return res
    }

    next()
  }

export const headers =
  (fn: TransformHeader): RequestHandler =>
  (req, res, next) => {
    const original = res.end

    res.end = function (this: Response) {
      res.end = original
      if (!res.headersSent) {
        try {
          fn(req, res)
        } catch (e) {
          errorHandler(e, req, res, next)
          return res
        }
        if (res.headersSent) {
          console.error(
            'sending response while in headers is undefined behaviour'
          )
          return res
        }
      }
      return original.apply(this, arguments as any)
    }

    next()
  }

export const headersAsync =
  (fn: TransformHeaderAsync): RequestHandler =>
  (req, res, next) => {
    const originalEnd = res.end

    res.end = function (this: Response) {
      if (res.headersSent) return originalEnd.apply(this, arguments as any)

      try {
        fn(req, res)
          .then(() => {
            res.end = originalEnd

            if (res.headersSent) return

            originalEnd.apply(this, arguments as any)
          })
          .catch(e => {
            res.end = originalEnd
            return errorHandler(e, req, res, next)
          })
      } catch (e) {
        res.end = originalEnd
        errorHandler(e, req, res, next)
        return res
      }

      res.end = function (this: Response) {
        res.__isEnd = true
        return res
      }

      return res
    }

    next()
  }

export const write =
  (fn: TransformChunk, { runOnError }: Options = {}): RequestHandler =>
  (req, res, next) => {
    const original = res.write

    res.write = function (this: Response, chunk) {
      // If res.end has already been called, do nothing.
      if (res.writableEnded) {
        return false
      }

      // Do not mung on errors
      if (!runOnError && res.statusCode >= 400) {
        return original.apply(res, arguments as any)
      }

      try {
        let modifiedChunk = fn(
          chunk,
          // Since `encoding` is an optional argument to `res.write`,
          // make sure it is a string and not actually the callback.
          typeof arguments[1] === 'string' ? arguments[1] : null,
          req,
          res
        )

        // res.finished is set to `true` once res.end has been called.
        // If it is called in the mung function, stop execution here.
        if (res.writableEnded) {
          return false
        }

        // If no returned value from fn, then set it back to the original value
        if (modifiedChunk === undefined) {
          modifiedChunk = chunk
        }

        arguments[0] = modifiedChunk
        return original.apply(res, arguments as any)
      } catch (err) {
        errorHandler(err, req, res, next)
        return false
      }
    }

    next()
  }
