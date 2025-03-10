import express, { ErrorRequestHandler } from 'express'
import * as responseMiddleware from '../main'
import request from 'supertest'
import { TransformAsync } from '../main'

describe('jsonAsync', () => {
  const noop: TransformAsync = (json, _req, _res) => {
    return new Promise(resolve => {
      resolve(json)
    })
  }

  const inspect: TransformAsync = (json, _req, _res) => {
    return new Promise(resolve => {
      resolve(json)
    }).then((json: any) => {
      json.inspected_by = 'me'
      return json
    })
  }

  const remove: TransformAsync = (json, _req, _res) => {
    return new Promise(resolve => {
      resolve(json)
    }).then(() => null)
  }

  const reduce: TransformAsync = (json, _req, _res) => {
    return new Promise(resolve => {
      resolve(json)
    }).then((json: any) => json.a)
  }

  const life: TransformAsync = (json, _req, _res) => {
    return new Promise(resolve => {
      resolve(json)
    }).then(() => 42)
  }

  const error: TransformAsync = (json, _req, _res) => {
    return new Promise(resolve => {
      resolve(json)
    }).then((json: any) => json.foo.bar.hopefully.fails())
  }

  it('should return the JSON result', async () => {
    const server = express()
      .use(responseMiddleware.jsonAsync(inspect))
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
      .use(responseMiddleware.jsonAsync(inspect))
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
      .use(responseMiddleware.jsonAsync(remove))
      .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(204)
  })

  it('should return a scalar result as text/plain', async () => {
    const server = express()
      .use(responseMiddleware.jsonAsync(reduce))
      .get('/', (_req, res) => res.status(200).json({ a: 'alpha' }).end())

    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(200)
    expect(response.text).toStrictEqual('alpha')
    expect(response.headers).toStrictEqual(
      expect.objectContaining({ 'content-type': 'text/plain; charset=utf-8' })
    )
  })

  it('should return a number as text/plain', async () => {
    const server = express()
      .use(responseMiddleware.jsonAsync(life))
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

  it('should return a number as application/json', async () => {
    const server = express()
      .use(responseMiddleware.jsonAsync(noop))
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
    const error: TransformAsync = (json, _req, res) => {
      res.status(403).send('no permissions')
      return Promise.resolve(json)
    }
    const server = express()
      .use(responseMiddleware.jsonAsync(error))
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
      .use(responseMiddleware.jsonAsync(error))
      .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(500)
  })
})
