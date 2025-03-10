export * from './jsonMiddleware'
export * from './endMiddleware'
export * from './writeMiddleware'

declare global {
  namespace Express {
    interface Response {
      __isEnd?: boolean
    }
  }
}
