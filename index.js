'use strict'

let responseMiddleware = {}
let faux_fin = { end: () => null }

function isScalar(v) {
  return typeof v !== 'object' && !Array.isArray(v)
}

responseMiddleware.onError = (err, req, res, next) => {
  res
    .status(500)
    .set('content-language', 'en')
    .json({ message: err.message })
    .end()
  return res
}

responseMiddleware.json = function json(fn, options) {
  return function (req, res, next) {
    let original = res.json
    options = options || {}
    let runOnError = options.runOnError

    function json_hook(json) {
      let originalJson = json
      res.json = original
      if (res.headersSent) return res
      if (!runOnError && res.statusCode >= 400) return original.call(this, json)

      // Run the munger
      try {
        json = fn(json, req, res)
      } catch (e) {
        return responseMiddleware.onError(e, req, res, next)
      }
      if (res.headersSent) return res

      // If no returned value from fn, then assume json has been mucked with.
      if (json === undefined) json = originalJson

      // If null, then 204 No Content
      if (json === null) return res.status(204).end()

      // If munged scalar value, then text/plain
      if (originalJson !== json && isScalar(json)) {
        res.set('content-type', 'text/plain')
        return res.send(String(json))
      }

      return original.call(this, json)
    }
    res.json = json_hook

    next && next()
  }
}

responseMiddleware.jsonAsync = function json(fn, options) {
  return function (req, res, next) {
    let original = res.json
    options = options || {}
    let runOnError = options.runOnError

    function json_async_hook(json) {
      let originalJson = json
      res.json = original
      if (res.headersSent) return
      if (!runOnError && res.statusCode >= 400) return original.call(this, json)
      try {
        fn(json, req, res)
          .then(json => {
            if (res.headersSent) return

            // If null, then 204 No Content
            if (json === null) return res.status(204).end()

            // If munged scalar value, then text/plain
            if (json !== originalJson && isScalar(json)) {
              res.set('content-type', 'text/plain')
              return res.send(String(json))
            }

            return original.call(this, json)
          })
          .catch(e => responseMiddleware.onError(e, req, res, next))
      } catch (e) {
        responseMiddleware.onError(e, req, res, next)
      }

      return faux_fin
    }
    res.json = json_async_hook

    next && next()
  }
}

responseMiddleware.headers = function headers(fn) {
  return function (req, res, next) {
    let original = res.end
    function headers_hook() {
      res.end = original
      if (!res.headersSent) {
        try {
          fn(req, res)
        } catch (e) {
          return responseMiddleware.onError(e, req, res, next)
        }
        if (res.headersSent) {
          console.error(
            'sending response while in mung.headers is undefined behaviour'
          )
          return
        }
      }
      return original.apply(this, arguments)
    }
    res.end = headers_hook

    next && next()
  }
}

responseMiddleware.headersAsync = function headersAsync(fn) {
  return function (req, res, next) {
    let original = res.end
    let onError = e => {
      res.end = original
      return responseMiddleware.onError(e, req, res, next)
    }
    function headers_async_hook() {
      let args = arguments
      if (res.headersSent) return original.apply(this, args)
      res.end = () => null
      try {
        fn(req, res)
          .then(() => {
            res.end = original
            if (res.headersSent) return
            original.apply(this, args)
          })
          .catch(e => onError(e, req, res, next))
      } catch (e) {
        onError(e, req, res, next)
      }
    }
    res.end = headers_async_hook

    next && next()
  }
}

responseMiddleware.write = function write(fn, options = {}) {
  return function (req, res, next) {
    const original = res.write
    const runOnError = options.runOnError

    function write_hook(chunk, encoding, callback) {
      // If res.end has already been called, do nothing.
      if (res.finished) {
        return false
      }

      // Do not mung on errors
      if (!runOnError && res.statusCode >= 400) {
        return original.apply(res, arguments)
      }

      try {
        let modifiedChunk = fn(
          chunk,
          // Since `encoding` is an optional argument to `res.write`,
          // make sure it is a string and not actually the callback.
          typeof encoding === 'string' ? encoding : null,
          req,
          res
        )

        // res.finished is set to `true` once res.end has been called.
        // If it is called in the mung function, stop execution here.
        if (res.finished) {
          return false
        }

        // If no returned value from fn, then set it back to the original value
        if (modifiedChunk === undefined) {
          modifiedChunk = chunk
        }

        return original.call(res, modifiedChunk, encoding, callback)
      } catch (err) {
        return responseMiddleware.onError(err, req, res, next)
      }
    }

    res.write = write_hook

    next && next()
  }
}

module.exports = responseMiddleware
