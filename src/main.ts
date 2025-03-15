export * from './jsonMiddleware'
export * from './endMiddleware'
export * from './writeMiddleware'
export * from './jsonpMiddleware'

declare global {
  namespace Express {
    interface Response {
      __isEnd?: boolean
      __isHooked?: boolean
    }
  }
}
