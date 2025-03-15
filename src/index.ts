export * from './jsonMiddleware.js'
export * from './endMiddleware.js'
export * from './writeMiddleware.js'
export * from './jsonpMiddleware.js'

declare global {
  namespace Express {
    interface Response {
      __isEnd?: boolean
      __isHooked?: boolean
    }
  }
}
