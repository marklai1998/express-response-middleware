import { ErrorRequestHandler, Request, RequestHandler, Response } from 'express'

export type Transform = (body: {}, request: Request, response: Response) => any
export type TransformAsync = (
  body: {},
  request: Request,
  response: Response
) => Promise<any>
export type TransformHeader = (request: Request, response: Response) => any
export type TransformHeaderAsync = (
  request: Request,
  response: Response
) => Promise<any>
export type TransformChunk = (
  chunk: string | Buffer,
  encoding: string | null,
  request: Request,
  response: Response
) => void | string | Buffer

export type Options = {
  runOnError?: boolean
}

let faux_fin = { end: () => null }

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
    const original = res.json

    res.json = function (this: Response, json) {
      const originalJson = json
      res.json = original
      if (res.headersSent) return res
      if (!runOnError && res.statusCode >= 400) return original.call(this, json)

      // Run the munger
      try {
        json = fn(json, req, res)
      } catch (e) {
        errorHandler(e, req, res, next)
        return res
      }
      if (res.headersSent) return res

      // If no returned value from fn, then assume json has been mucked with.
      if (json === undefined) json = originalJson

      // If null, then 204 No Content
      if (json === null) return res.status(204).end()

      // If munged scalar value, then text/plain
      if (originalJson !== json && isScalar(json)) {
        res.set('content-type', 'text/plain')
        return res.send(String(json))
      }

      return original.call(this, json)
    }

    return next()
  }

export const jsonAsync =
  (fn: TransformAsync, { runOnError }: Options = {}): RequestHandler =>
  (req, res, next) => {
    const original = res.json

    res.json = function (this: Response, json) {
      const originalJson = json
      res.json = original
      if (res.headersSent) return res
      if (!runOnError && res.statusCode >= 400) return original.call(this, json)
      try {
        fn(json, req, res)
          .then(json => {
            if (res.headersSent) return

            // If null, then 204 No Content
            if (json === null) return res.status(204).end()

            // If munged scalar value, then text/plain
            if (json !== originalJson && isScalar(json)) {
              res.set('content-type', 'text/plain')
              return res.send(String(json))
            }

            return original.call(this, json)
          })
          .catch(e => errorHandler(e, req, res, next))
      } catch (e) {
        errorHandler(e, req, res, next)
      }

      return faux_fin
    }

    return next()
  }

export const headers =
  (fn: TransformHeader): RequestHandler =>
  (req, res, next) => {
    const original = res.end
    function headersHook() {
      res.end = original
      if (!res.headersSent) {
        try {
          fn(req, res)
        } catch (e) {
          return errorHandler(e, req, res, next)
        }
        if (res.headersSent) {
          console.error(
            'sending response while in mung.headers is undefined behaviour'
          )
          return
        }
      }
      return original.apply(this, arguments)
    }
    res.end = headersHook

    next && next()
  }

export const headersAsync =
  (fn: TransformHeaderAsync): RequestHandler =>
  (req, res, next) => {
    const original = res.end
    let onError = (e: any, req: any, res: any, next: any) => {
      res.end = original
      return errorHandler(e, req, res, next)
    }
    function headerAsyncHook() {
      let args = arguments
      if (res.headersSent) return original.apply(this, args)
      res.end = () => null
      try {
        fn(req, res)
          .then(() => {
            res.end = original
            if (res.headersSent) return
            original.apply(this, args)
          })
          .catch(e => onError(e, req, res, next))
      } catch (e) {
        onError(e, req, res, next)
      }
    }
    res.end = headerAsyncHook

    next && next()
  }

export const write =
  (fn: TransformChunk, { runOnError }: Options = {}): RequestHandler =>
  (req, res, next) => {
    const original = res.write

    function writeHook(chunk: any, encoding: any, callback: any) {
      // If res.end has already been called, do nothing.
      if (res.finished) {
        return false
      }

      // Do not mung on errors
      if (!runOnError && res.statusCode >= 400) {
        return original.apply(res, arguments)
      }

      try {
        let modifiedChunk = fn(
          chunk,
          // Since `encoding` is an optional argument to `res.write`,
          // make sure it is a string and not actually the callback.
          typeof encoding === 'string' ? encoding : null,
          req,
          res
        )

        // res.finished is set to `true` once res.end has been called.
        // If it is called in the mung function, stop execution here.
        if (res.finished) {
          return false
        }

        // If no returned value from fn, then set it back to the original value
        if (modifiedChunk === undefined) {
          modifiedChunk = chunk
        }

        return original.call(res, modifiedChunk, encoding, callback)
      } catch (err) {
        return errorHandler(err, req, res, next)
      }
    }

    res.write = writeHook as any

    next && next()
  }
