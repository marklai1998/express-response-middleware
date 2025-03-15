# express-response-middleware

> [!NOTE]  
> V2 is still WIP, meanwhile please check out [V1](docs/V1_README.md)

> [!NOTE]  
> Come from express-mung? Checkout the [Migration Guide](docs/MIGRATE_FROM_MUNG.md)

<div align="center">

Middleware for express responses. Fork of [express-mung](https://www.npmjs.com/package/express-mung)

This package allows synchronous and asynchronous transformation of an express response. This is a similar concept to the express middleware for a request but for a response. Note that the middleware is executed in LIFO order. It is implemented by monkey patching (hooking) the `res.end`, `res.json`, or `res.write` methods.

[Installation](#-installation) | [Quick Start](#-quick-start) | [API](#-api) | [Contributing](#-contributing)

</div>

## 📦 Installation

### NPM

```bash
npm i express-response-middleware
```

### Yarn

```
yarn add express-response-middleware
```

### PNPM

```
pnpm i express-response-middleware
```

## 🚀 Quick Start

Sample middleware (redact.js) to remove classified information.

```javascript
import { jsonMiddleware } from 'express-response-middleware'

/* Remove any classified information from the response. */
export const hideSecretMiddleware = jsonMiddleware((body, req, res) => {
    if (body.secret) body.secret = '****'
    // ...
    return body
})
```

then add to your `app.js` file (before the route handling middleware)

```javascript
app.use(hideSecretMiddleware)
```

## 💻 API

- [Json Middleware](#jsonmiddleware)
- [Jsonp Middleware](#jsonpmiddleware)
- [End Middleware](#endMiddleware)
- [Write Middleware](#endMiddleware)
- Legacy docs
  - [V1](docs/V1_README.md)

### `jsonMiddleware`

Intercept `res.json`, allow transform the JSON body of the response.

```ts
import { jsonMiddleware } from 'express-response-middleware'

const myMiddleware = jsonMiddleware((json, req, res) => {
    // your code here
    return json
})
```

### `jsonpMiddleware`

Intercept `res.jsonp`, allow transform the JSON body of the response.

```ts
import { jsonpMiddleware } from 'express-response-middleware'

const myMiddleware = jsonpMiddleware((json, req, res) => {
    // your code here
    return json
})
```

### `endMiddleware`

Intercept `end.json`, allow transform the HTTP headers of the response.

```ts
import { endMiddleware } from 'express-response-middleware'

const myMiddleware = endMiddleware((req, res) => {
    // your code here
})
```

> [!CAUTION]
> Sending a response while in `endMiddleware*` is **undefined behaviour** and will most likely result in an error

### `writeMiddleware`

Intercept `end.write`, allow transform buffer.

```ts
import { writeMiddleware } from 'express-response-middleware'

const myMiddleware = writeMiddleware((chunk, encoding, req, res) => {
    // your code here
    return chunk
})
```

> [!CAUTION]
> Promise callback support is limited, it doesn't resolve multiple write call yet [Code](src/writeMiddleware.ts)

- When `writeMiddleware` detects that a response has completed (i.e. if `res.end` has been called), it will abort.
- Calling `res.json` or `res.send` from `writeMiddleware` can lead to unexpected behavior since they end the response internally.
- The returned value of `res.write` will be inaccurate when using `writeMiddleware`, beware if you rely on it
- `res.end` after `res.write` would not trigger endMiddleware, as header already sent

## Exception handling

`responseMiddleware` catches any exception (synchronous, asynchronous or Promise reject) and sends an HTTP 500 response with the exception message. You should handle your own error if you want different behavior

## 🤝 Contributing

### TODO

Current state project is up to modern standard and support all of the `express-mung` use case, here is the list that I think can improve on. 

- [ ] Support multiple write call for async handler
- [ ] `res.send` Support

### Development

#### Local Development

```bash
pnpm i
pnpm test
```

#### Build

```bash
pnpm build
```

### Release

This repo uses [Release Please](https://github.com/google-github-actions/release-please-action) to release.

#### To release a new version

1. Merge your changes into the `main` branch.
2. An automated GitHub Action will run, triggering the creation of a Release PR.
3. Merge the release PR.
4. Wait for the second GitHub Action to run automatically.
5. Congratulations, you're all set!
