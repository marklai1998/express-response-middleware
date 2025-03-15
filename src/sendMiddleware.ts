import { Request, RequestHandler, Response } from 'express'
import { errorHandler } from './utils/errorHandler.js'

export type TransformSend<T = unknown> = (
  body: T,
  request: Request,
  response: Response
) => unknown | Promise<unknown>

export const sendMiddleware =
  (fn: TransformSend): RequestHandler =>
  (req, res, next) => {
    const originalSendFn = res.send

    res.send = function (this: Response, payload) {
      if (res.headersSent) return res

      let mayBePromise
      try {
        mayBePromise = fn(payload, req, res)
      } catch (e) {
        res.send = originalSendFn
        errorHandler(e, req, res, next)
        return res
      }

      if (mayBePromise instanceof Promise) {
        mayBePromise
          .then(result => {
            if (res.headersSent) return

            originalSendFn.call(this, result === undefined ? payload : result)
          })
          .catch(e => {
            res.send = originalSendFn
            errorHandler(e, req, res, next)
          })
      } else {
        const result = mayBePromise

        if (res.headersSent) return res

        originalSendFn.call(this, result === undefined ? payload : result)
      }

      return res
    }

    next()
  }
