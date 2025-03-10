export * from './jsonMiddleware'
export * from './headersMiddleware'
export * from './writeMiddleware'

declare global {
  namespace Express {
    interface Response {
      __isEnd?: boolean
    }
  }
}
