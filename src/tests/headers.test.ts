import express from 'express'
import request from 'supertest'
import { expect } from 'vitest'
import { endMiddleware, TransformHeaders } from '../main'
import { sleep } from './testHelpers/sleep'

describe('headers', () => {
  // TODO: try send
  const header: TransformHeaders = (_req, res) => {
    res.set('x-inspected-by', 'me')
  }

  const headerAsync: TransformHeaders = async (_req, res) => {
    await sleep()
    res.set('x-inspected-by', 'me')
    await sleep()

    return
  }

  const error: TransformHeaders = req => {
    ;(req as any).hopefully_fails()
  }

  const errorAsync: TransformHeaders = async req => {
    await sleep()
    ;(req as any).hopefully_fails()
    await sleep()

    return
  }

  it.each([header, headerAsync])('should return the headers', async handler => {
    const server = express()
      .use(endMiddleware(handler))
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
        .use(endMiddleware(handler))
        .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
      const response = await request(server).get('/')

      expect(response.status).toStrictEqual(500)
    }
  )
})
