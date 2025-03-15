import { sendMiddleware, TransformSend } from '../sendMiddleware.js'
import request from 'supertest'
import express from 'express'
import { expect } from 'vitest'
import { sleep } from './testHelpers/sleep.js'

describe('sendMiddleware', () => {
  const modifyText: TransformSend = data => {
    return data + ' with more content'
  }

  const modifyTextAsync: TransformSend = async data => {
    await sleep()
    return data + ' with more content'
  }

  const modifyText2: TransformSend = data => {
    return data + ' with more content 2'
  }

  const modifyTextAsync2: TransformSend = async data => {
    await sleep()
    return data + ' with more content 2'
  }

  const modifyJson: TransformSend = data => {
    if (typeof data === 'object') {
      ;(data as any).b = 'b'
    }

    return data
  }

  const modifyJsonAsync: TransformSend = async data => {
    await sleep()

    if (typeof data === 'object') {
      ;(data as any).b = 'b'
    }
    await sleep()

    return data
  }

  const error: TransformSend = data => {
    ;(data as any).foo.bar.hopefully.fails()
    return data
  }

  const errorAsync: TransformSend = async data => {
    await sleep()
    ;(data as any).foo.bar.hopefully.fails()
    await sleep()
    return data
  }

  const error403: TransformSend = (data, _req, res) => {
    res.status(403).end()
    return data
  }

  const error403Async: TransformSend = async (data, _req, res) => {
    await sleep()
    res.status(403).end()
    await sleep()

    return data
  }

  it.each([modifyText, modifyTextAsync])(
    'should return the modified text result',
    async handler => {
      const server = express()
        .use(sendMiddleware(handler))
        .get('/', (_req, res) => {
          res.send('This is the response body')
        })
      const response = await request(server).get('/')

      expect(response.text).toStrictEqual(
        'This is the response body with more content'
      )
    }
  )

  it.each([
    [modifyText, modifyText2],
    [modifyText, modifyTextAsync2],
    [modifyTextAsync, modifyText2],
    [modifyTextAsync, modifyTextAsync2],
  ])('should work with multiple middleware', async (handler, handler2) => {
    const server = express()
      .use(sendMiddleware(handler))
      .use(sendMiddleware(handler2))
      .get('/', (_req, res) => res.send('This is the response body'))
    const response = await request(server).get('/')

    expect(response.text).toStrictEqual(
      'This is the response body with more content 2 with more content'
    )
  })

  it.each([modifyJson, modifyJsonAsync])(
    'should return a modified json body ',
    async handler => {
      const server = express()
        .use(sendMiddleware(handler))
        .get('/', (_req, res) => {
          res.send({
            a: 'a',
          })
        })
      const response = await request(server).get('/')

      expect(response.status).toStrictEqual(200)
      expect(response.body).toStrictEqual({
        a: 'a',
        b: 'b',
      })
    }
  )

  it.each([modifyText, modifyTextAsync])(
    'should send an error response',
    async handler => {
      const server = express()
        .use(sendMiddleware(handler))
        .get('/', (_req, res) => {
          res.status(404).send('This is the response body')
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
        .use(sendMiddleware(handler))
        .get('/', (_req, res) => {
          res.status(200).send('This is the response body')
        })
      const response = await request(server).get('/')

      expect(response.status).toStrictEqual(403)
    }
  )

  it.each([error, errorAsync])(
    'should 500 on a synchronous exception',
    async handler => {
      const server = express()
        .use(sendMiddleware(handler))
        .get('/', (_req, res) => {
          res.status(200).send('This is the response body')
        })

      const response = await request(server).get('/')

      expect(response.status).toStrictEqual(500)
    }
  )

  it.each([error, errorAsync])(
    'should 500 on an asynchronous exception',
    async handler => {
      const server = express()
        .use(sendMiddleware(handler))
        .get('/', (_req, res) => {
          process.nextTick(() => {
            res.status(200).send('This is the response body')
          })
        })

      const response = await request(server).get('/')

      expect(response.status).toStrictEqual(500)
    }
  )
})
