import { Request, RequestHandler, Response } from 'express'
import { errorHandler } from './utils/errorHandler.js'

export type TransformEnd = (
  request: Request,
  response: Response
) => unknown | Promise<unknown>

export const endMiddleware =
  (fn: TransformEnd): RequestHandler =>
  (req, res, next) => {
    const originalEndFn = res.end

    res.end = function (this: Response) {
      if (res.headersSent) return originalEndFn.apply(this, arguments as any)

      let mayBePromise
      try {
        mayBePromise = fn(req, res)
      } catch (e) {
        res.end = originalEndFn
        errorHandler(e, req, res, next)
        return res
      }

      if (mayBePromise instanceof Promise) {
        mayBePromise
          .then(() => {
            if (res.headersSent) {
              console.error(
                'sending response while in endMiddleware is undefined behaviour'
              )
              return
            }

            originalEndFn.apply(this, arguments as any)
          })
          .catch(e => {
            res.end = originalEndFn
            errorHandler(e, req, res, next)
          })

        res.end = function (this: Response) {
          return res
        }
      } else {
        if (res.headersSent) {
          console.error(
            'sending response while in endMiddleware is undefined behaviour'
          )
          return res
        }

        return originalEndFn.apply(this, arguments as any)
      }

      return res
    }

    next()
  }
