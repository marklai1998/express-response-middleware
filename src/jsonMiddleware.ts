import { Request, RequestHandler, Response } from 'express'
import { errorHandler } from './utils/errorHandler'

export type TransformJson<T = {}> = (
  body: T,
  request: Request,
  response: Response
) => unknown | Promise<unknown>

export const jsonMiddleware =
  (fn: TransformJson): RequestHandler =>
  (req, res, next) => {
    const originalJsonFn = res.json
    const originalEnd = res.end

    res.json = function (this: Response, json) {
      const originalJson = json
      res.json = originalJsonFn

      if (res.headersSent) return res

      let mayBePromise
      try {
        mayBePromise = fn(json, req, res)
      } catch (e) {
        errorHandler(e, req, res, next)
        return res
      }

      if (mayBePromise instanceof Promise) {
        void (async () => {
          try {
            const result = await mayBePromise

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
      } else {
        const result = mayBePromise

        if (res.headersSent) return res

        originalJsonFn.call(this, result === undefined ? originalJson : result)
      }

      return res
    }

    next()
  }
