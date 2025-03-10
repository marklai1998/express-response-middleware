import express from 'express'
import request from 'supertest'
import { expect } from 'vitest'
import { headersMiddleware, TransformHeader } from '../main'

describe('headers', () => {
  const header: TransformHeader = (_req, res) => {
    res.set('x-inspected-by', 'me')
  }

  const headerAsync: TransformHeader = (_req, res) => {
    return Promise.resolve(true).then(() => {
      res.set('x-inspected-by', 'me')
    })
  }

  const error: TransformHeader = (req, _res) => {
    ;(req as any).hopefully_fails()
  }

  const errorAsync: TransformHeader = (req, _res) => {
    return Promise.resolve(true).then(() => {
      ;(req as any).hopefully_fails()
    })
  }

  it.each([header, headerAsync])('should return the headers', async handler => {
    const server = express()
      .use(headersMiddleware(handler))
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

  it.each([error, errorAsync])(
    'should 500 on a synchronous exception',
    async handler => {
      const server = express()
        .use(headersMiddleware(handler))
        .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
      const response = await request(server).get('/')

      expect(response.status).toStrictEqual(500)
    }
  )
})
