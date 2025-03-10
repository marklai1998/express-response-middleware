import express, { ErrorRequestHandler } from 'express'
import request from 'supertest'
import { jsonMiddleware, Transform } from '../main'

describe('jsonMiddleware', () => {
  const noop: Transform = (json, _req, _res) => {
    return new Promise(resolve => {
      resolve(json)
    })
  }

  const inspect: Transform = (json, _req, _res) => {
    return new Promise(resolve => {
      resolve(json)
    }).then((json: any) => {
      json.inspected_by = 'me'
      return json
    })
  }

  const error: Transform = (json, _req, _res) => {
    return new Promise(resolve => {
      resolve(json)
    }).then((json: any) => json.foo.bar.hopefully.fails())
  }

  it('should return the JSON result', async () => {
    const server = express()
      .use(jsonMiddleware(inspect))
      .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
    const response = await request(server).get('/')

    const expected = { a: 'a', inspected_by: 'me' }

    expect(response.status).toStrictEqual(200)
    expect(response.body).toStrictEqual(expected)
    expect(response.headers['content-length']).toStrictEqual(
      JSON.stringify(expected).length.toString()
    )
  })

  it('should call callback with an error', async () => {
    const server = express()
      .use(jsonMiddleware(inspect))
      .get('/', (_req, res) => res.status(404).json({ a: 'a' }).end())
    const response = await request(server).get('/')

    const expected = { a: 'a', inspected_by: 'me' }

    expect(response.status).toStrictEqual(404)
    expect(response.body).toStrictEqual(expected)
    expect(response.headers['content-length']).toStrictEqual(
      JSON.stringify(expected).length.toString()
    )
  })

  it('should return a number as application/json', async () => {
    const server = express()
      .use(jsonMiddleware(noop))
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
    const error: Transform = (json, _req, res) => {
      res.status(403).send('no permissions')
      return Promise.resolve(json)
    }
    const server = express()
      .use(jsonMiddleware(error))
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

  it('should 500 on an exception', async () => {
    const errorHandler: ErrorRequestHandler = (err, _req, res, _next) =>
      res.status(501).send(err.message).end()
    const server = express()
      .use(errorHandler)
      .use(jsonMiddleware(error))
      .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(500)
  })
})
