import express from 'express'
import * as responseMiddleware from '../index'
import request from 'supertest'
import { expect } from 'vitest'

describe('headers', () => {
  it('should return the headers', async () => {
    const server = express()
      .use(
        responseMiddleware.headers((_req, res) => {
          res.set('x-inspected-by', 'me')
        })
      )
      .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(200)
    expect(response.body).toStrictEqual({ a: 'a' })
    expect(response.headers).toStrictEqual(
      expect.objectContaining({
        'x-inspected-by': 'me',
      })
    )
  })

  it('should work with promises', async () => {
    const server = express()
      .use(
        responseMiddleware.headersAsync((_req, res) => {
          return Promise.resolve(true).then(() => {
            res.set('x-inspected-by', 'me')
          })
        })
      )
      .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(200)
    expect(response.body).toStrictEqual({ a: 'a' })
    expect(response.headers).toStrictEqual(
      expect.objectContaining({
        'x-inspected-by': 'me',
      })
    )
  })

  it('should 500 on a synchronous exception', async () => {
    const server = express()
      .use(
        responseMiddleware.headers((req, _res) => {
          ;(req as any).hopefully_fails()
        })
      )
      .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(500)
  })

  it('should 500 on an asynchronous exception', async () => {
    const server = express()
      .use(
        responseMiddleware.headersAsync((req, _res) => {
          return Promise.resolve(true).then(() => {
            ;(req as any).hopefully_fails()
          })
        })
      )
      .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(500)
  })
})
