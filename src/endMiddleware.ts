import { Request, RequestHandler, Response } from 'express'
import { errorHandler } from './utils/errorHandler'

export type TransformHeaders = (
  request: Request,
  response: Response
) => unknown | Promise<unknown>

export const endMiddleware =
  (fn: TransformHeaders): RequestHandler =>
  (req, res, next) => {
    const originalEnd = res.end

    res.end = function (this: Response) {
      let mayBePromise
      try {
        mayBePromise = fn(req, res)
      } catch (e) {
        res.end = originalEnd
        errorHandler(e, req, res, next)
        return res
      }

      if (mayBePromise instanceof Promise) {
        void (async () => {
          try {
            await mayBePromise

            res.end = originalEnd

            if (res.headersSent) return

            originalEnd.apply(this, arguments as any)
          } catch (e) {
            res.end = originalEnd
            errorHandler(e, req, res, next)
          }
        })()

        res.end = function (this: Response) {
          return res
        }
      } else {
        res.end = originalEnd

        if (res.headersSent) return res

        return originalEnd.apply(this, arguments as any)
      }

      return res
    }

    next()
  }
