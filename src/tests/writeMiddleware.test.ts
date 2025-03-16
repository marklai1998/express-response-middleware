import express, { ErrorRequestHandler } from 'express'
import request from 'supertest'
import { TransformChunk, writeMiddleware } from '../index.js'
import { expect } from 'vitest'
import { sleep } from './testHelpers/sleep.js'

describe('write', () => {
  const appendText: TransformChunk = chunk => {
    return chunk + ' with more content'
  }

  const appendTextAsync: TransformChunk = async chunk => {
    await sleep()
    return chunk + ' with more content'
  }

  const doNothing: TransformChunk = () => {}

  const doNothingAsync: TransformChunk = async () => {
    await sleep()
  }

  const appendText2: TransformChunk = chunk => {
    return chunk + ' with more content2'
  }

  const appendTextAsync2: TransformChunk = async chunk => {
    await sleep()
    return chunk + ' with more content2'
  }

  const inspectJson: TransformChunk = chunk => {
    try {
      const json = JSON.parse(String(chunk))
      json.inspected_by = 'me'
      return JSON.stringify({ ...json, inspected_by: 'me' })
    } catch (e) {
      console.log('JSON parse error')
      throw e
    }
  }

  const inspectJsonAsync: TransformChunk = chunk => {
    try {
      sleep()
      const json = JSON.parse(String(chunk))
      json.inspected_by = 'me'
      sleep()
      return JSON.stringify({ ...json, inspected_by: 'me' })
    } catch (e) {
      console.log('JSON parse error')
      throw e
    }
  }

  const error: TransformChunk = chunk => {
    ;(chunk as any).foo.bar.hopefully.fails()
  }

  const errorAsync: TransformChunk = async chunk => {
    await sleep()
    ;(chunk as any).foo.bar.hopefully.fails()
  }

  const error403: TransformChunk = (_chunk, _encoding, _req, res) => {
    res.status(403).json({ foo: 'bar ' })
  }

  const error403Async: TransformChunk = (_chunk, _encoding, _req, res) => {
    res.status(403).json({ foo: 'bar ' })
  }

  it.each([appendText, appendTextAsync])(
    'should return the text result',
    async handler => {
      const server = express()
        .use(writeMiddleware(handler))
        .get('/', (_req, res) => {
          res.status(200).write('This is the response body', 'utf-8')
          res.end()
        })
      const response = await request(server).get('/')

      expect(response.status).toStrictEqual(200)
      expect(response.text).toStrictEqual(
        'This is the response body with more content'
      )
    }
  )

  it.each([appendText, appendTextAsync])(
    'should not call if header is already sent',
    async handler => {
      const handlerSpy = vi.fn(handler)

      const server = express()
        .use(writeMiddleware(handlerSpy))
        .get('/', (_req, res) => {
          res.end()
          res.status(200).write('This is the response body')
        })
      const response = await request(server).get('/')

      expect(handlerSpy).not.toHaveBeenCalled()
      expect(response.status).toStrictEqual(200)
    }
  )

  it.each([doNothing, doNothingAsync])(
    'should return the text result if callback return void',
    async handler => {
      const server = express()
        .use(writeMiddleware(handler))
        .get('/', (_req, res) => {
          res.status(200).write(Buffer.from('This is the response body'))
          res.end()
        })
      const response = await request(server).get('/')

      expect(response.status).toStrictEqual(200)
      expect(response.text).toStrictEqual('This is the response body')
    }
  )

  it.each([
    [
      appendText,
      appendText2,
      'This is the response body with more content2 with more content',
    ],
    [
      appendText,
      appendTextAsync2,
      'This is the response body with more content2 with more content',
    ],
    [
      appendTextAsync,
      appendText2,
      'This is the response body with more content2 with more content',
    ],
    [
      appendTextAsync,
      appendTextAsync2,
      'This is the response body with more content2 with more content',
    ],
  ])(
    'should work with multiple middleware',
    async (handler, handler2, expectStr) => {
      const server = express()
        .use(writeMiddleware(handler))
        .use(writeMiddleware(handler2))
        .get('/', (_req, res) => {
          res.status(200).write('This is the response body')
          res.end()
        })
      const response = await request(server).get('/')

      expect(response.status).toStrictEqual(200)
      expect(response.text).toStrictEqual(expectStr)
    }
  )

  it.each([inspectJson, inspectJsonAsync])(
    'should return a `body` when the content type is application/json',
    async handler => {
      const server = express()
        .use(writeMiddleware(handler))
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
    }
  )

  it.each([appendText, appendTextAsync])(
    'should call callback an error response',
    async handler => {
      const server = express()
        .use(writeMiddleware(handler))
        .get('/', (_req, res) => {
          res.status(404).write('This is the response body')
          res.end()
        })
      const response = await request(server).get('/')

      expect(response.status).toStrictEqual(404)
      expect(response.text).toStrictEqual(
        'This is the response body with more content'
      )
    }
  )

  it.each([error403, error403Async])(
    'should abort if a response is sent',
    async handler => {
      const server = express()
        .use(writeMiddleware(handler))
        .get('/', (_req, res) => {
          res
            .set('Content-Type', 'application/json')
            .status(200)
            .write('This is the response body')
          res.end()
        })
      const response = await request(server).get('/')

      expect(response.status).to.equal(403)
    }
  )

  it.each([error, errorAsync])(
    'should 500 on a synchronous exception',
    async handler => {
      const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
        res.status(500).send(err.message).end()
      }
      const server = express()
        .use(errorHandler)
        .use(writeMiddleware(handler))
        .get('/', (_req, res) => {
          res
            .set('Content-Type', 'application/json')
            .status(200)
            .write('This is the response body')
          res.end()
        })
      const response = await request(server).get('/')

      expect(response.status).toStrictEqual(500)
    }
  )

  it.each([error, errorAsync])(
    'should 500 on an asynchronous exception',
    async handler => {
      const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
        res.status(500).send(err.message).end()
      }
      const server = express()
        .use(errorHandler)
        .use(writeMiddleware(handler))
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
    }
  )
})
