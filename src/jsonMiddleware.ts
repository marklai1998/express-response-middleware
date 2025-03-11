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

            if (res.headersSent) return

            originalJsonFn.call(
              this,
              result === undefined ? originalJson : result
            )
          } catch (e) {
            errorHandler(e, req, res, next)
          }
        })()

        return new Proxy(res, {
          get(target: any, prop) {
            if (prop === 'end') {
              return function (this: Response) {
                return origMethod.apply(this, arguments as any)
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
      } else {
        const result = mayBePromise

        if (res.headersSent) return res

        originalJsonFn.call(this, result === undefined ? originalJson : result)
      }

      return res
    }

    next()
  }
