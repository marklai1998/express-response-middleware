# express-response-middleware

Middleware for express responses.

This package allows synchronous and asynchronous transformation of an express response. This is a similar concept to the express middleware for a request but for a response. Note that the middleware is executed in LIFO order. It is implemented by monkey patching (hooking) the `res.end`, `res.json`, or `res.write` methods.

## Getting started [![npm version](https://badge.fury.io/js/express-response-middleware.svg)](https://badge.fury.io/js/express-response-middleware)

    $ npm install express-response-middleware --save

Then in your middleware

    var responseMiddleware = require('express-response-middleware');

    module.exports = responseMiddleware.json(my_transform);

## Usage

Sample middleware (redact.js) to remove classified information.

```javascript
'use strict'
const responseMiddleware = require('express-response-middleware')

/* Remove any classified information from the response. */
function redact(body, req, res) {
  if (body.secret) body.secret = '****'
  // ...
  return body
}

module.exports = responseMiddleware.json(redact)
```

then add to your `app.js` file (before the route handling middleware)

```javascript
app.use(require('./redact'))
```

and [_That's all folks!_](https://www.youtube.com/watch?v=gBzJGckMYO4)

See the mocha [tests](https://github.com/marklai1998/express-response-middleware/tree/master/test) for some more examples.

## Reference

### responseMiddleware.json(fn)

Transform the JSON body of the response.

`fn(json, req, res)` receives the JSON as an object, the `req` and `res`. It returns the modified body. If `undefined` is returned (i.e. nothing) then the original JSON is assumed to be modified. If `null` is returned, then a 204 No Content HTTP status is returned to client.

### responseMiddleware.jsonAsync(fn)

Asynchronously transform the JSON body of the response.

`fn(json, req, res)` receives the JSON as an object, the `req` and `res`. It returns a promise to a modified body. The promise returns an `object.` If it is `null` then a 204 No Content is sent to the client.

### responseMiddleware.headers(fn)

Transform the HTTP headers of the response.

`fn(req, res)` receives the `req` and `res`. It should modify the header(s) and then return.

### responseMiddleware.headersAsync(fn)

Asynchronously transform the HTTP headers of the response.

`fn(req, res)` receives the `req` and `res`. It returns a `promise` to modify the header(s).

### responseMiddleware.write(fn)

`fn(chunk, encoding, req, res)` receives the string or buffer as `chunk`, its `encoding` if applicable (`null` otherwise), `req` and `res`. It returns the modified body. If `undefined` is returned (i.e. nothing) then the original unmodified chunk is used.

### Notes

- when `responseMiddleware.json*` receives a scalar value then the `content-type` is switched `text-plain`.

- when `responseMiddleware.json*` detects that a response has been sent, it will abort.

- sending a response while in `responseMiddleware.headers*` is **undefined behaviour** and will most likely result in an error.

- when `responseMiddleware.write` detects that a response has completed (i.e. if `res.end` has been called), it will abort.

- calling `res.json` or `res.send` from `responseMiddleware.write` can lead to unexpected behavior since they end the response internally.

## Exception handling

`responseMiddleware` catches any exception (synchronous, asynchronous or Promise reject) and sends an HTTP 500 response with the exception message. You should handle your own error if you want different behavior

## Migrate from `express-mung`

### To V2

V2 completely rewrote in ESM

#### Update Import

Before
```ts
import mung from 'express-mung'

mung.onError = customErrorHandle

const myMiddleware = responseMiddleware.json((json) => {
  // your code
})
```

After
```ts
import responseMiddleware from 'express-response-middleware'

const myMiddleware = responseMiddleware.json((json) => {
    // your code
})
```

#### Remove `onError` override

It is now impossible to override `onError` due to ESM code base, you should try catch your own error

Before
```ts
import mung from 'express-mung'

mung.onError = customErrorHandle

const myMiddleware = responseMiddleware.json((json) => {
  // your code
})
```

After
```ts
import responseMiddleware from 'express-response-middleware'

const myMiddleware = responseMiddleware.json((json) => {
  try {
    // your code
  } catch (e){ // onError equivalent
    customErrorHandle(e)
  }
})
```

#### Remove `mungError`

`mungError` is Removed and callback is always called

Before
```ts
import mung from 'express-mung'

// Would not run on res.statusCode >= 400, unless mungError is set to true
const myMiddleware = mung.json((json) => { 
  // code
  return json
})
```

After
```ts
import responseMiddleware from 'express-response-middleware'

// Would always run, you have to do your own filtering
const myMiddleware = responseMiddleware.json((json) => {
    if (res.statusCode >= 400) return
    return json
})
```



#### Remove `content-type` handler

Remove auto `content-type`, you should set correct content type when returning different data

> Note. Express allow sending plain text with `.json` and content type will still be json, this change is to stick to vanilla behavior  

Before
```ts
import mung from 'express-mung'

const myMiddleware = mung.json((json) => {
  const hasPermission = false
  if (!hasPermission) return "Forbidden" // `content-type` will automatically set to `text/plain`
  return json
})
```

After
```ts
import responseMiddleware from 'express-response-middleware'

const myMiddleware = responseMiddleware.json((json) => {
    const hasPermission = false
    if (!hasPermission) {
        res.send("Forbidden")
        return
    }
    return json
})
```


### To V1

V1 is mostly just fork of `express-mung` with integrated types

- Update the import
- Rename option `mungError` to `runOnError`

```diff
- import mung from 'express-mung'
+ import responseMiddleware from 'express-response-middleware'

const myMiddleware = responseMiddleware.json(() => {
  // code here
},
- { mungError: true }
+ { runOnError: true }
)
```

# License

The MIT license
