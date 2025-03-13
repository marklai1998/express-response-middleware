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

    res.json = function (this: Response, json) {
      const originalJson = json

      let mayBePromise
      try {
        mayBePromise = fn(json, req, res)
      } catch (e) {
        res.json = originalJsonFn
        errorHandler(e, req, res, next)
        return res
      }

      if (mayBePromise instanceof Promise) {
        void (async () => {
          try {
            const result = await mayBePromise

            if (res.headersSent) return

            originalJsonFn.call(
              this,
              result === undefined ? originalJson : result
            )
          } catch (e) {
            res.json = originalJsonFn
            errorHandler(e, req, res, next)
          }
        })()
      } else {
        const result = mayBePromise

        if (res.headersSent) return res

        originalJsonFn.call(this, result === undefined ? originalJson : result)
      }

      return new Proxy(this, {
        get(target: any, prop) {
          if (prop === 'end') {
            return function (this: Response) {
              return this
            }
          }

          const origMethod = target[prop]
          if (typeof origMethod == 'function') {
            return function (this: Response, ...args: unknown[]) {
              return origMethod.apply(this, args)
            }
          }
          return origMethod
        },
      })
    }

    next()
  }
