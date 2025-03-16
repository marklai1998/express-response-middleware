import { ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  res
    .status(500)
    .set('content-language', 'en')
    .json({ message: err.message })
    .end()
}
