/// <reference types="node"/>

import { ErrorRequestHandler, Request, RequestHandler, Response } from 'express'

export type Transform = (body: {}, request: Request, response: Response) => any
export type TransformAsync = (
  body: {},
  request: Request,
  response: Response
) => PromiseLike<any>
export type TransformHeader = (request: Request, response: Response) => any
export type TransformHeaderAsync = (
  request: Request,
  response: Response
) => PromiseLike<any>
export type TransformChunk = (
  chunk: string | Buffer,
  encoding: string | null,
  request: Request,
  response: Response
) => string | Buffer

export interface Options {
  runOnError: boolean
}

/**
 * Transform the JSON body of the response.
 * @param fn A transformation function.
 * @param options json options.
 * @return Middleware to transform the body
 */
export function json(fn: Transform, options?: Options): RequestHandler

/**
 * Asynchronously transform the JSON body of the response.
 * @param fn A transformation function.
 * @param options jsonAsync options.
 * @return Middleware to transform the body
 */
export function jsonAsync(fn: TransformAsync, options?: Options): RequestHandler

/**
 * Transform the HTTP headers of the response.
 * @param fn A transformation function.
 * @return Middleware to transform the headers
 */
export function headers(fn: TransformHeader): RequestHandler

/**
 * Asynchronously transform the HTTP headers of the response.
 * @param fn A transformation function.
 * @return Middleware to transform the headers
 */
export function headersAsync(fn: TransformHeaderAsync): RequestHandler

/**
 * Transform chunks as they are written to the response
 * @param fn A transformation function.
 * @param options Write options.
 * @return Middleware to transform chunks.
 */
export function write(fn: TransformChunk, options?: Options): RequestHandler

/**
 * Override the default onError handler.
 * @see {ErrorRequestHandler}
 */
export let onError: ErrorRequestHandler
