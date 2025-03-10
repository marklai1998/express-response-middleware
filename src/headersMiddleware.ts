import { Request, RequestHandler, Response } from 'express'
import { errorHandler } from './utils/errorHandler'

export type TransformHeaders = (
  request: Request,
  response: Response
) => unknown | Promise<unknown>

export const headersMiddleware =
  (fn: TransformHeaders): RequestHandler =>
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
