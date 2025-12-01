import express from "express";
import request from "supertest";
import { expect } from "vitest";
import { endMiddleware, type TransformEnd } from "../index.js";
import { sleep } from "./testHelpers/sleep.js";

describe("endMiddleware", () => {
  const header: TransformEnd = (_req, res) => {
    res.set("x-inspected-by", "me");
  };

  const headerAsync: TransformEnd = async (_req, res) => {
    await sleep();
    res.set("x-inspected-by", "me");
    await sleep();

    return;
  };

  const header2: TransformEnd = (_req, res) => {
    res.set("x-inspected-by-2", "him");
  };

  const headerAsync2: TransformEnd = async (_req, res) => {
    await sleep();
    res.set("x-inspected-by-2", "him");
    await sleep();

    return;
  };

  const error: TransformEnd = (req) => {
    (req as any).hopefully_fails();
  };

  const errorAsync: TransformEnd = async (req) => {
    await sleep();
    (req as any).hopefully_fails();
    await sleep();

    return;
  };

  it.each([
    header,
    headerAsync,
  ])("should return the headers", async (handler) => {
    const server = express()
      .use(endMiddleware(handler))
      .get("/", (_req, res) => {
        res.status(200).json({ a: "a" }).end();
      });
    const response = await request(server).get("/");

    expect(response.status).toStrictEqual(200);
    expect(response.body).toStrictEqual({ a: "a" });
    expect(response.headers).toStrictEqual(
      expect.objectContaining({
        "x-inspected-by": "me",
      }),
    );
  });

  it.each([
    [header, header2],
    [header, headerAsync2],
    [headerAsync, header2],
    [headerAsync, headerAsync2],
  ])("should work with multiple middleware", async (handler, handler2) => {
    const server = express()
      .use(endMiddleware(handler))
      .use(endMiddleware(handler2))
      .get("/", (_req, res) => {
        res.status(200).json({ a: "a" }).end();
      });
    const response = await request(server).get("/");

    expect(response.status).toStrictEqual(200);
    expect(response.body).toStrictEqual({ a: "a" });
    expect(response.headers).toStrictEqual(
      expect.objectContaining({
        "x-inspected-by": "me",
        "x-inspected-by-2": "him",
      }),
    );
  });

  it.each([
    error,
    errorAsync,
  ])("should 500 on a synchronous exception", async (handler) => {
    const server = express()
      .use(endMiddleware(handler))
      .get("/", (_req, res) => {
        res.status(200).json({ a: "a" }).end();
      });
    const response = await request(server).get("/");

    expect(response.status).toStrictEqual(500);
  });
});
