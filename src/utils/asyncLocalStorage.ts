import { AsyncLocalStorage } from 'node:async_hooks'

export const isInSend = new AsyncLocalStorage<boolean>()
