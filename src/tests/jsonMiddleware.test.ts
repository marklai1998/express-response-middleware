import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { expect } from 'vitest';
import { jsonMiddleware, type TransformJson } from '../index.js';
import { sleep } from './testHelpers/sleep.js';

describe('jsonMiddleware', () => {
  const noop: TransformJson = () => {};

  const noopAsync: TransformJson = async (json) => {
    await sleep();
    return json;
  };

  const inspect: TransformJson<any> = (json) => {
    return { ...json, inspected_by: 'me' };
  };

  const inspectMutate: TransformJson<any> = (json) => {
    json.inspected_by = 'me';
  };

  const inspect2: TransformJson<any> = (json) => {
    json.inspected_by_2 = 'him';
    return json;
  };

  const inspectMutateAsync: TransformJson = async (json) => {
    await sleep();
    (json as any).inspected_by = 'me';
    await sleep();
  };

  const inspectAsync: TransformJson = async (json) => {
    await sleep();
    const res = { ...(json as object), inspected_by: 'me' };
    await sleep();

    return res;
  };

  const inspectAsync2: TransformJson = async (json) => {
    await sleep();
    (json as any).inspected_by_2 = 'him';
    await sleep();

    return json;
  };

  const error: TransformJson<any> = (json) => {
    json.foo.bar.hopefully.fails();
  };

  const errorAsync: TransformJson<any> = async (json) => {
    await sleep();
    json.foo.bar.hopefully.fails();
    await sleep();

    return json;
  };

  const noPermission: TransformJson = (_json, _req, res) => {
    res.status(403).send('no permissions');
  };

  const noPermissionAsync: TransformJson = async (json, _req, res) => {
    await sleep();
    res.status(403).send('no permissions');
    await sleep();

    return Promise.resolve(json);
  };

  it.each([inspect, inspectAsync, inspectMutate, inspectMutateAsync])(
    'should return the JSON result',
    async (handler) => {
      const server = express()
        .use(jsonMiddleware(handler))
        .get('/', (_req, res) => {
          res.status(200).json({ a: 'a' }).end();
        });
      const response = await request(server).get('/');

      const expected = { a: 'a', inspected_by: 'me' };

      expect(response.status).toStrictEqual(200);
      expect(response.body).toStrictEqual(expected);
      expect(response.headers['content-length']).toStrictEqual(
        JSON.stringify(expected).length.toString(),
      );
    },
  );

  it.each([inspect, inspectAsync])(
    'should not call if header is already sent',
    async (handler) => {
      const handlerSpy = vi.fn(handler);

      const server = express()
        .use(jsonMiddleware(handlerSpy))
        .get('/', (_req, res) => {
          res.end();
          res.status(200).json({ a: 'a' }).end();
        });
      const response = await request(server).get('/');

      expect(handlerSpy).not.toHaveBeenCalled();
      expect(response.status).toStrictEqual(200);
    },
  );

  it.each([
    [inspect, inspect2],
    [inspect, inspectAsync2],
    [inspectAsync, inspect2],
    [inspectAsync, inspectAsync2],
  ])('should work with multiple middleware', async (handler, handler2) => {
    const server = express()
      .use(jsonMiddleware(handler))
      .use(jsonMiddleware(handler2))
      .get('/', (_req, res) => {
        res.status(200).json({ a: 'a' }).end();
      });
    const response = await request(server).get('/');

    const expected = { a: 'a', inspected_by: 'me', inspected_by_2: 'him' };

    expect(response.status).toStrictEqual(200);
    expect(response.body).toStrictEqual(expected);
    expect(response.headers['content-length']).toStrictEqual(
      JSON.stringify(expected).length.toString(),
    );
  });

  it.each([inspect, inspectAsync])(
    'should call callback with an error',
    async (handler) => {
      const server = express()
        .use(jsonMiddleware(handler))
        .get('/', (_req, res) => {
          res.status(404).json({ a: 'a' }).end();
        });
      const response = await request(server).get('/');

      const expected = { a: 'a', inspected_by: 'me' };

      expect(response.status).toStrictEqual(404);
      expect(response.body).toStrictEqual(expected);
      expect(response.headers['content-length']).toStrictEqual(
        JSON.stringify(expected).length.toString(),
      );
    },
  );

  it.each([inspect, inspectAsync])(
    'should return the JSON result from a res.send',
    async (handler) => {
      const server = express()
        .use(jsonMiddleware(handler))
        .get('/', (_req, res) => {
          res.status(200).send({ a: 'a' }).end();
        });
      const response = await request(server).get('/');

      const expected = { a: 'a', inspected_by: 'me' };

      expect(response.status).toStrictEqual(200);
      expect(response.body).toStrictEqual(expected);
      expect(response.headers['content-length']).toStrictEqual(
        JSON.stringify(expected).length.toString(),
      );
    },
  );

  it.each([noop, noopAsync])(
    'should return a as application/json',
    async (handler) => {
      const server = express()
        .use(jsonMiddleware(handler))
        .get('/', (_req, res) => {
          res.status(200).json(42).end();
        });
      const response = await request(server).get('/');

      expect(response.status).toStrictEqual(200);
      expect(response.text).toStrictEqual('42');
      expect(response.headers).toStrictEqual(
        expect.objectContaining({
          'content-type': 'application/json; charset=utf-8',
        }),
      );
    },
  );

  it.each([noPermission, noPermissionAsync])(
    'should abort if a response is sent',
    async (handler) => {
      const server = express()
        .use(jsonMiddleware(handler))
        .get('/', (_req, res) => {
          res.status(200).json({ a: 'a' }).end();
        });
      const response = await request(server).get('/');

      expect(response.status).toStrictEqual(403);
      expect(response.text).toStrictEqual('no permissions');
      expect(response.headers).toStrictEqual(
        expect.objectContaining({
          'content-type': 'text/html; charset=utf-8',
        }),
      );
    },
  );

  it.each([error, errorAsync])(
    'should 500 on a synchronous exception',
    async (handler) => {
      const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
        res.status(500).send(err.message).end();
      };
      const server = express()
        .use(errorHandler)
        .use(jsonMiddleware(handler))
        .get('/', (_req, res) => {
          res.status(200).json({ a: 'a' }).end();
        });

      const response = await request(server).get('/');

      expect(response.status).toStrictEqual(500);
    },
  );

  it.each([error, errorAsync])(
    'should 500 on an asynchronous exception',
    async (handler) => {
      const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
        res.status(500).send(err.message).end();
      };
      const server = express()
        .use(errorHandler)
        .use(jsonMiddleware(handler))
        .get('/', (_req, res) => {
          process.nextTick(() => {
            res.status(200).json({ a: 'a' }).end();
          });
        });
      const response = await request(server).get('/');

      expect(response.status).toStrictEqual(500);
    },
  );
});
