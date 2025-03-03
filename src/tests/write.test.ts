import express, { ErrorRequestHandler } from 'express'
import * as responseMiddleware from '../index'
import request from 'supertest'
import { TransformChunk } from '../index'
import { expect } from 'vitest'

describe('write', () => {
  const appendText: TransformChunk = (chunk, _encoding, _req, _res) => {
    return chunk + ' with more content'
  }

  const inspectJson: TransformChunk = (chunk, _encoding, _req, _res) => {
    try {
      const json = JSON.parse(String(chunk))
      json.inspected_by = 'me'
      return JSON.stringify(json)
    } catch (e) {
      console.log('JSON parse error')
      throw e
    }
  }

  const error: TransformChunk = (chunk, _encoding, _req, _res) => {
    ;(chunk as any).foo.bar.hopefully.fails()
  }

  const error403: TransformChunk = (_chunk, _encoding, _req, res) => {
    res.status(403).json({ foo: 'bar ' })
  }

  it('should return the text result', async () => {
    const server = express()
      .use(responseMiddleware.write(appendText))
      .get('/', (_req, res) => {
        res.status(200).write('This is the response body')
        res.end()
      })
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(200)
    expect(response.text).toStrictEqual(
      'This is the response body with more content'
    )
  })

  it('should return a `body` when the content type is application/json', async () => {
    const server = express()
      .use(responseMiddleware.write(inspectJson))
      .get('/', (_req, res) => {
        res
          .set('Content-Type', 'application/json')
          .status(200)
          .write(
            JSON.stringify({
              a: 'a',
            })
          )
        res.end()
      })
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(200)
    expect(response.body).toStrictEqual({ a: 'a', inspected_by: 'me' })
  })

  it('should not call callback with an error response (by default)', async () => {
    const server = express()
      .use(responseMiddleware.write(appendText))
      .get('/', (_req, res) => {
        res.status(404).write('This is the response body')
        res.end()
      })

    const response = await request(server).get('/')
    expect(response.status).toStrictEqual(404)
    expect(response.text).toStrictEqual('This is the response body')
    expect(response.body).toStrictEqual({})
  })

  it('should call callback an error response when told to', async () => {
    const server = express()
      .use(responseMiddleware.write(appendText, { runOnError: true }))
      .get('/', (_req, res) => {
        res.status(404).write('This is the response body')
        res.end()
      })
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(404)
    expect(response.text).toStrictEqual(
      'This is the response body with more content'
    )
  })

  it('should abort if a response is sent', async () => {
    const server = express()
      .use(responseMiddleware.write(error403))
      .get('/', (_req, res) => {
        res
          .set('Content-Type', 'application/json')
          .status(200)
          .write('This is the response body')
        res.end()
      })
    const response = await request(server).get('/')

    expect(response.status).to.equal(403)
  })

  it('should 500 on a synchronous exception', async () => {
    const errorHandler: ErrorRequestHandler = (err, _req, res, _next) =>
      res.status(500).send(err.message).end()
    const server = express()
      .use(errorHandler)
      .use(responseMiddleware.write(error))
      .get('/', (_req, res) => {
        res
          .set('Content-Type', 'application/json')
          .status(200)
          .write('This is the response body')
        res.end()
      })
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(500)
  })

  it('should 500 on an asynchronous exception', async () => {
    const errorHandler: ErrorRequestHandler = (err, _req, res, _next) =>
      res.status(500).send(err.message).end()
    const server = express()
      .use(errorHandler)
      .use(responseMiddleware.write(error))
      .get('/', (_req, res) => {
        process.nextTick(() => {
          res
            .set('Content-Type', 'application/json')
            .status(200)
            .write('This is the response body')
          res.end()
        })
      })
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(500)
  })
})
