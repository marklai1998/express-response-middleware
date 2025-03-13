# Migrate from `express-mung`

- [To V2 (Recommended)](#to-v2)
- [To V1](#to-v1)

## To V2

### Requirement

V2 completely rewrote in ESM with modern syntax

- Node 18 or above

### Update Import

- `mung.json` => `jsonMiddleware`
- `mung.jsonAsync` => `jsonMiddleware`
- `mung.headers` => `endMiddleware`
- `mung.headersAsync` => `endMiddleware`

Before
```ts
import mung from 'express-mung'

const myMiddleware = mung.json((json) => {
  // your code
})
```

After
```ts
import { jsonMiddleware } from 'express-response-middleware'

const myMiddleware = jsonMiddleware((json) => {
    // your code
})
```

### Remove `onError` override

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

### Remove `mungError`

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

### headerSent Handling

Middleware will still call if headers are being sent (res.headersSent === `true`)

#### Remove `content-type` and 204 handler

- Removed auto `content-type` to `text/plain`, you should set correct content type when returning different data
- Removed 204 handler with null return, you should set correct status when returning different data

> Note. Express allow sending plain text and null with `.json` and content type will still be json + 200, this change is to stick to vanilla behavior

Before
```ts
import mung from 'express-mung'

const myMiddleware = mung.json((json) => {
  const hasPermission = false
  const shouldSendNull = false
  if (!hasPermission) return "Forbidden" // `content-type` will automatically set to `text/plain`
  if (shouldSendNull) return null // `status` will automatically set to 204
  return json
})
```

After
```ts
import responseMiddleware from 'express-response-middleware'

const myMiddleware = responseMiddleware.json((json) => {
    const hasPermission = false
    const shouldSendNull = false
    if (!hasPermission) {
        res.send("Forbidden")
        return
    }
    if (shouldSendNull) {
        res.status(204)
        return null
    }
    return json
})
```

## To V1

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
