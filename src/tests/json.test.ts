import express, { ErrorRequestHandler } from 'express'
import * as responseMiddleware from '../index'
import request from 'supertest'
import { Transform } from '../index'

describe('json', () => {
  const noop: Transform = (_json, _req, _res) => {}

  const inspect: Transform = (json, _req, _res) => {
    ;(json as any).inspected_by = 'me'
  }

  const remove: Transform = (_json, _req, _res) => {
    return null
  }

  const reduce: Transform = (json, _req, _res) => {
    return (json as any).a
  }

  const life: Transform = (_json, _req, _res) => {
    return 42
  }

  const error: Transform = (json, _req, _res) => {
    ;(json as any).foo.bar.hopefully.fails()
  }

  it('should return the JSON result', async () => {
    const server = express()
      .use(responseMiddleware.json(inspect))
      .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
    const response = await request(server).get('/')

    const expected = { a: 'a', inspected_by: 'me' }

    expect(response.status).toStrictEqual(200)
    expect(response.body).toStrictEqual(expected)
    expect(response.headers['content-length']).toStrictEqual(
      JSON.stringify(expected).length.toString()
    )
  })

  it('should not call callback with an error response (by default)', async () => {
    const server = express()
      .use(responseMiddleware.json(inspect))
      .get('/', (_req, res) => res.status(404).json({ a: 'a' }).end())
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(404)
    expect(response.body).not.toHaveProperty('inspected_by')
  })

  it('should call callback with an error response when told to', async () => {
    const server = express()
      .use(responseMiddleware.json(inspect, { runOnError: true }))
      .get('/', (_req, res) => res.status(404).json({ a: 'a' }).end())
    const response = await request(server).get('/')

    const expected = { a: 'a', inspected_by: 'me' }

    expect(response.status).toStrictEqual(404)
    expect(response.body).toStrictEqual(expected)
    expect(response.headers['content-length']).toStrictEqual(
      JSON.stringify(expected).length.toString()
    )
  })

  it('should return 204 on null JSON result', async () => {
    const server = express()
      .use(responseMiddleware.json(remove))
      .get('/', (_req, res) => res.status(200).json({ a: 'a' }))
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(204)
  })

  it('should return the JSON result from a res.send', async () => {
    const server = express()
      .use(responseMiddleware.json(inspect))
      .get('/', (_req, res) => res.status(200).send({ a: 'a' }).end())
    const response = await request(server).get('/')

    let expected = { a: 'a', inspected_by: 'me' }

    expect(response.status).toStrictEqual(200)
    expect(response.body).toStrictEqual(expected)
    expect(response.headers['content-length']).toStrictEqual(
      JSON.stringify(expected).length.toString()
    )
  })

  it('should return a scalar result as text/plain', async () => {
    const server = express()
      .use(responseMiddleware.json(reduce))
      .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(200)
    expect(response.text).toStrictEqual('a')
    expect(response.headers).toStrictEqual(
      expect.objectContaining({ 'content-type': 'text/plain; charset=utf-8' })
    )
  })

  it('should return a number as text/plain', async () => {
    const server = express()
      .use(responseMiddleware.json(life))
      .get('/', (_req, res) =>
        res.status(200).json('the meaning of life').end()
      )
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(200)
    expect(response.text).toStrictEqual('42')
    expect(response.headers).toStrictEqual(
      expect.objectContaining({ 'content-type': 'text/plain; charset=utf-8' })
    )
  })

  it('should return a as application/json', async () => {
    const server = express()
      .use(responseMiddleware.json(noop))
      .get('/', (_req, res) => res.status(200).json(42).end())
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(200)
    expect(response.text).toStrictEqual('42')
    expect(response.headers).toStrictEqual(
      expect.objectContaining({
        'content-type': 'application/json; charset=utf-8',
      })
    )
  })

  it('should abort if a response is sent', async () => {
    const server = express()
      .use(
        responseMiddleware.json((_json, _req, res) => {
          res.status(403).send('no permissions')
        })
      )
      .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(403)
    expect(response.text).toStrictEqual('no permissions')
    expect(response.headers).toStrictEqual(
      expect.objectContaining({
        'content-type': 'text/html; charset=utf-8',
      })
    )
  })

  it('should 500 on a synchronous exception', async () => {
    const errorHandler: ErrorRequestHandler = (err, _req, res, _next) =>
      res.status(500).send(err.message).end()
    const server = express()
      .use(errorHandler)
      .use(responseMiddleware.json(error))
      .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())

    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(500)
  })

  it('should 500 on an asynchronous exception', async () => {
    const errorHandler: ErrorRequestHandler = (err, _req, res, _next) =>
      res.status(500).send(err.message).end()
    const server = express()
      .use(errorHandler)
      .use(responseMiddleware.json(error))
      .get('/', (_req, res) => {
        process.nextTick(() => {
          res.status(200).json({ a: 'a' }).end()
        })
      })
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(500)
  })
})
