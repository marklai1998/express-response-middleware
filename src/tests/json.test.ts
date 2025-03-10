import express, { ErrorRequestHandler } from 'express'
import request from 'supertest'
import { jsonMiddleware, Transform } from '../main'

describe('jsonMiddleware', () => {
  const noop: Transform = (_json, _req, _res) => {}

  const inspect: Transform = (json, _req, _res) => {
    ;(json as any).inspected_by = 'me'
  }

  const error: Transform = (json, _req, _res) => {
    ;(json as any).foo.bar.hopefully.fails()
  }

  const noopAsync: Transform = (json, _req, _res) => {
    return new Promise(resolve => {
      resolve(json)
    })
  }

  const inspectAsync: Transform = (json, _req, _res) => {
    return new Promise(resolve => {
      resolve(json)
    }).then((json: any) => {
      json.inspected_by = 'me'
      return json
    })
  }

  const errorAsync: Transform = (json, _req, _res) => {
    return new Promise(resolve => {
      resolve(json)
    }).then((json: any) => json.foo.bar.hopefully.fails())
  }

  const noPermission: Transform = (_json, _req, res) => {
    res.status(403).send('no permissions')
  }

  const noPermissionAsync: Transform = (json, _req, res) => {
    res.status(403).send('no permissions')
    return Promise.resolve(json)
  }

  it.each([inspect, inspectAsync])(
    'should return the JSON result',
    async handler => {
      const server = express()
        .use(jsonMiddleware(handler))
        .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
      const response = await request(server).get('/')

      const expected = { a: 'a', inspected_by: 'me' }

      expect(response.status).toStrictEqual(200)
      expect(response.body).toStrictEqual(expected)
      expect(response.headers['content-length']).toStrictEqual(
        JSON.stringify(expected).length.toString()
      )
    }
  )

  it.each([inspect, inspectAsync])(
    'should call callback with an error',
    async handler => {
      const server = express()
        .use(jsonMiddleware(handler))
        .get('/', (_req, res) => res.status(404).json({ a: 'a' }).end())
      const response = await request(server).get('/')

      const expected = { a: 'a', inspected_by: 'me' }

      expect(response.status).toStrictEqual(404)
      expect(response.body).toStrictEqual(expected)
      expect(response.headers['content-length']).toStrictEqual(
        JSON.stringify(expected).length.toString()
      )
    }
  )

  it.each([inspect, inspectAsync])(
    'should return the JSON result from a res.send',
    async handler => {
      const server = express()
        .use(jsonMiddleware(handler))
        .get('/', (_req, res) => res.status(200).send({ a: 'a' }).end())
      const response = await request(server).get('/')

      let expected = { a: 'a', inspected_by: 'me' }

      expect(response.status).toStrictEqual(200)
      expect(response.body).toStrictEqual(expected)
      expect(response.headers['content-length']).toStrictEqual(
        JSON.stringify(expected).length.toString()
      )
    }
  )

  it.each([noop, noopAsync])(
    'should return a as application/json',
    async handler => {
      const server = express()
        .use(jsonMiddleware(handler))
        .get('/', (_req, res) => res.status(200).json(42).end())
      const response = await request(server).get('/')

      expect(response.status).toStrictEqual(200)
      expect(response.text).toStrictEqual('42')
      expect(response.headers).toStrictEqual(
        expect.objectContaining({
          'content-type': 'application/json; charset=utf-8',
        })
      )
    }
  )

  it.each([noPermission, noPermissionAsync])(
    'should abort if a response is sent',
    async handler => {
      const server = express()
        .use(jsonMiddleware(handler))
        .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
      const response = await request(server).get('/')

      expect(response.status).toStrictEqual(403)
      expect(response.text).toStrictEqual('no permissions')
      expect(response.headers).toStrictEqual(
        expect.objectContaining({
          'content-type': 'text/html; charset=utf-8',
        })
      )
    }
  )

  it.each([error, errorAsync])(
    'should 500 on a synchronous exception',
    async handler => {
      const errorHandler: ErrorRequestHandler = (err, _req, res, _next) =>
        res.status(500).send(err.message).end()
      const server = express()
        .use(errorHandler)
        .use(jsonMiddleware(handler))
        .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())

      const response = await request(server).get('/')

      expect(response.status).toStrictEqual(500)
    }
  )

  it.each([error, errorAsync])(
    'should 500 on an asynchronous exception',
    async handler => {
      const errorHandler: ErrorRequestHandler = (err, _req, res, _next) =>
        res.status(500).send(err.message).end()
      const server = express()
        .use(errorHandler)
        .use(jsonMiddleware(handler))
        .get('/', (_req, res) => {
          process.nextTick(() => {
            res.status(200).json({ a: 'a' }).end()
          })
        })
      const response = await request(server).get('/')

      expect(response.status).toStrictEqual(500)
    }
  )
})
