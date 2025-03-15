import express from 'express'
import request from 'supertest'
import { expect } from 'vitest'
import {
  endMiddleware,
  jsonMiddleware,
  jsonpMiddleware,
  TransformChunk,
  TransformEnd,
  TransformJson,
  writeMiddleware,
} from '../index.js'
import { sleep } from './testHelpers/sleep.js'
import { sendMiddleware, TransformSend } from '../sendMiddleware.js'

describe('mix and match', () => {
  const header: TransformEnd = (_req, res) => {
    res.set('x-inspected-by', 'me')
  }

  const headerAsync: TransformEnd = async (_req, res) => {
    await sleep()
    res.set('x-inspected-by', 'me')
    await sleep()

    return
  }

  const inspect: TransformJson<any> = json => {
    json.inspected_by = 'me'
    return json
  }

  const inspectAsync: TransformJson = async json => {
    await sleep()
    ;(json as any).inspected_by = 'me'
    await sleep()

    return json
  }

  const appendText: TransformChunk = chunk => {
    return chunk + ' with more content'
  }

  const appendTextAsync: TransformChunk = async chunk => {
    await sleep()
    return chunk + ' with more content'
  }

  const modifyText: TransformSend = data => {
    return data + ' with more content'
  }

  const modifyTextAsync: TransformSend = async data => {
    await sleep()
    return data + ' with more content'
  }

  it.each([
    [inspect, header],
    [inspectAsync, header],
    [inspect, headerAsync],
    [inspectAsync, headerAsync],
  ])('end should work with json', async (jsonHandler, endHandler) => {
    const server = express()
      .use(jsonMiddleware(jsonHandler))
      .use(endMiddleware(endHandler))
      .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
    const response = await request(server).get('/')

    const expected = { a: 'a', inspected_by: 'me' }

    expect(response.status).toStrictEqual(200)
    expect(response.body).toStrictEqual(expected)
    expect(response.headers).toStrictEqual(
      expect.objectContaining({
        'x-inspected-by': 'me',
      })
    )
  })

  it.each([
    [inspect, header],
    [inspectAsync, header],
    [inspect, headerAsync],
    [inspectAsync, headerAsync],
  ])('end should work with json reverse', async (jsonHandler, endHandler) => {
    const server = express()
      .use(endMiddleware(endHandler))
      .use(jsonMiddleware(jsonHandler))
      .get('/', (_req, res) => res.status(200).json({ a: 'a' }).end())
    const response = await request(server).get('/')

    const expected = { a: 'a', inspected_by: 'me' }

    expect(response.status).toStrictEqual(200)
    expect(response.body).toStrictEqual(expected)
    expect(response.headers).toStrictEqual(
      expect.objectContaining({
        'x-inspected-by': 'me',
      })
    )
  })

  it.each([
    [inspect, header],
    [inspectAsync, header],
    [inspect, headerAsync],
    [inspectAsync, headerAsync],
  ])('end should work with jsonp', async (jsonHandler, endHandler) => {
    const server = express()
      .use(jsonpMiddleware(jsonHandler))
      .use(endMiddleware(endHandler))
      .get('/', (_req, res) => res.status(200).jsonp({ a: 'a' }).end())
    const response = await request(server).get('/')

    const expected = { a: 'a', inspected_by: 'me' }

    expect(response.status).toStrictEqual(200)
    expect(response.body).toStrictEqual(expected)
    expect(response.headers).toStrictEqual(
      expect.objectContaining({
        'x-inspected-by': 'me',
      })
    )
  })

  it.each([
    [inspect, header],
    [inspectAsync, header],
    [inspect, headerAsync],
    [inspectAsync, headerAsync],
  ])('end should work with json reverse', async (jsonHandler, endHandler) => {
    const server = express()
      .use(endMiddleware(endHandler))
      .use(jsonpMiddleware(jsonHandler))
      .get('/', (_req, res) => res.status(200).jsonp({ a: 'a' }).end())
    const response = await request(server).get('/')

    const expected = { a: 'a', inspected_by: 'me' }

    expect(response.status).toStrictEqual(200)
    expect(response.body).toStrictEqual(expected)
    expect(response.headers).toStrictEqual(
      expect.objectContaining({
        'x-inspected-by': 'me',
      })
    )
  })

  it.each([
    [modifyText, header],
    [modifyTextAsync, header],
    [modifyText, headerAsync],
    [modifyTextAsync, headerAsync],
  ])('end should work with send', async (sendHandler, endHandler) => {
    const server = express()
      .use(sendMiddleware(sendHandler))
      .use(endMiddleware(endHandler))
      .get('/', (_req, res) => {
        res.send('This is the response body')
      })
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(200)
    expect(response.text).toStrictEqual(
      'This is the response body with more content'
    )
    expect(response.headers).toStrictEqual(
      expect.objectContaining({
        'x-inspected-by': 'me',
      })
    )
  })

  it.each([
    [modifyText, header],
    [modifyTextAsync, header],
    [modifyText, headerAsync],
    [modifyTextAsync, headerAsync],
  ])('end should work with send', async (sendHandler, endHandler) => {
    const server = express()
      .use(endMiddleware(endHandler))
      .use(sendMiddleware(sendHandler))
      .get('/', (_req, res) => {
        res.send('This is the response body')
      })
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(200)
    expect(response.text).toStrictEqual(
      'This is the response body with more content'
    )
    expect(response.headers).toStrictEqual(
      expect.objectContaining({
        'x-inspected-by': 'me',
      })
    )
  })

  it.each([
    [appendText, header],
    [appendTextAsync, header],
    [appendText, headerAsync],
    [appendTextAsync, headerAsync],
  ])('end should work with write', async (writeHandler, endHandler) => {
    const server = express()
      .use(endMiddleware(endHandler))
      .use(writeMiddleware(writeHandler))
      .get('/', (_req, res) => {
        res.status(200).write('This is the response body')
        res.end()
      })
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(200)
    expect(response.text).toStrictEqual(
      'This is the response body with more content'
    )
    expect(response.headers).toStrictEqual(
      expect.not.objectContaining({
        'x-inspected-by': 'me',
      })
    )
  })

  it.each([
    [appendText, header],
    [appendTextAsync, header],
    [appendText, headerAsync],
    [appendTextAsync, headerAsync],
  ])('end should work with write reverse', async (writeHandler, endHandler) => {
    const server = express()
      .use(endMiddleware(endHandler))
      .use(writeMiddleware(writeHandler))
      .get('/', (_req, res) => {
        res.status(200).write('This is the response body')
        res.end()
      })
    const response = await request(server).get('/')

    expect(response.status).toStrictEqual(200)
    expect(response.text).toStrictEqual(
      'This is the response body with more content'
    )
    expect(response.headers).toStrictEqual(
      expect.not.objectContaining({
        'x-inspected-by': 'me',
      })
    )
  })
})
