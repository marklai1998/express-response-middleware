# Changelog

## [2.1.0](https://github.com/marklai1998/express-response-middleware/compare/v2.0.1...v2.1.0) (2025-03-15)


### Features

* set project type to module ([35769d7](https://github.com/marklai1998/express-response-middleware/commit/35769d740ab7d507d725ba1844516188319da759))

## [2.0.1](https://github.com/marklai1998/express-response-middleware/compare/v2.0.0...v2.0.1) (2025-03-15)


### Bug Fixes

* build entry file ([f82450f](https://github.com/marklai1998/express-response-middleware/commit/f82450fa402ced9307bd31192ca34cfbcb9dc4a3))

## [2.0.0](https://github.com/marklai1998/express-response-middleware/compare/v1.0.0...v2.0.0) (2025-03-15)


### ⚠ BREAKING CHANGES

* rename head middleware
* merge async headers
* set min node version
* merge async json
* rename function
* remove 204 handling
* remove scalar content type handling
* remove run on error option
* esm ([#4](https://github.com/marklai1998/express-response-middleware/issues/4))

### Features

* end handling ([f7884fd](https://github.com/marklai1998/express-response-middleware/commit/f7884fddbb6f986aa4f893cde0e8d6a1630b4cc8))
* esm ([#4](https://github.com/marklai1998/express-response-middleware/issues/4)) ([14ec0ed](https://github.com/marklai1998/express-response-middleware/commit/14ec0ed0f3792dedc6d3a9ae85b6c1f1dabb4cdf))
* jsonp support ([f724345](https://github.com/marklai1998/express-response-middleware/commit/f724345f3aa76c5b5631ace316fd283fecdb9933))
* merge async headers ([f7fd7c4](https://github.com/marklai1998/express-response-middleware/commit/f7fd7c4c75b57434b9eafbce18116edf94c7c36d))
* merge async json ([618b6f5](https://github.com/marklai1998/express-response-middleware/commit/618b6f5f0ba4d12b355583c5b99ff1b1ed9bec59))
* remove 204 handling ([f1c08b1](https://github.com/marklai1998/express-response-middleware/commit/f1c08b17c9f24fd7480e247508db9e7e9c0d7a96))
* remove run on error option ([ca8d1e3](https://github.com/marklai1998/express-response-middleware/commit/ca8d1e37ad25b346b7b17eeae6a193d4afa265cc))
* remove scalar content type handling ([3137434](https://github.com/marklai1998/express-response-middleware/commit/3137434c3a261f78304a449f5d7a39365f581b2d))
* rename function ([fae0ee9](https://github.com/marklai1998/express-response-middleware/commit/fae0ee9dbbf7b22216c5980d633c5640cccfb536))
* rename head middleware ([ce6c89a](https://github.com/marklai1998/express-response-middleware/commit/ce6c89a1faa234bde62315f0f9d8c364d0d0098d))
* send middleware ([d609cce](https://github.com/marklai1998/express-response-middleware/commit/d609ccee1bfd789ba75cbea6c8f09cfbb533a892))
* set min node version ([6d1a51b](https://github.com/marklai1998/express-response-middleware/commit/6d1a51b313e27095b88fbf8f3609fd518e489a5a))
* write async support ([4aef628](https://github.com/marklai1998/express-response-middleware/commit/4aef628b5e2f48efe2e4f6579841769a207767b8))


### Bug Fixes

* async handler ([5ab900b](https://github.com/marklai1998/express-response-middleware/commit/5ab900b80a3d612cf74d5be2f215473e9ee6a327))
* async handler ([d919cb3](https://github.com/marklai1998/express-response-middleware/commit/d919cb36aea38f58e9691a9b9879797ada6fd1b4))
* calling end in json without chaining ([2160658](https://github.com/marklai1998/express-response-middleware/commit/216065829dd1d95593bc188086050c3121912468))
* end hook ([e91ad26](https://github.com/marklai1998/express-response-middleware/commit/e91ad263eb828b00f1bdb0cf96fa091849125597))
* json middeware stacking ([44d51f8](https://github.com/marklai1998/express-response-middleware/commit/44d51f8782d3a112964e48c72ad92c4222ac476f))
* json middleware stacking ([c6cd298](https://github.com/marklai1998/express-response-middleware/commit/c6cd29836c0e86ab478004a573f321f648404251))
* set express as peer ([6409ec1](https://github.com/marklai1998/express-response-middleware/commit/6409ec12ce7ba90c187f9d56d0e6935625ebdaa7))
* stop hooks from calling when header is sent ([6fff520](https://github.com/marklai1998/express-response-middleware/commit/6fff520355b82d3fe2137919c86f6c2b32ae534b))

## 1.0.0 (2025-03-03)


### Features

* **mung:** option to allow munging of JSON errors, fixes [#7](https://github.com/marklai1998/express-response-middleware/issues/7) ([fa1b802](https://github.com/marklai1998/express-response-middleware/commit/fa1b8025aa2267d256e90d4143de3ea6e8a85a03))
* tests and better implementation for writeJson ([5369d3d](https://github.com/marklai1998/express-response-middleware/commit/5369d3d02848ac3c5031c75f530eef64d226c822))


### Bug Fixes

* args is not set ([031b0eb](https://github.com/marklai1998/express-response-middleware/commit/031b0ebde37f999295e7d2fa543933af13d5c27d))
* missing option change ([bcf292a](https://github.com/marklai1998/express-response-middleware/commit/bcf292a7e00b328757ce88f60282080bbf1a499d))
* remove mung names from public api ([c341e79](https://github.com/marklai1998/express-response-middleware/commit/c341e799d8026c60d888ce193f2660e7e1d30e09))
* returning a scalar number [#22](https://github.com/marklai1998/express-response-middleware/issues/22) ([dc57062](https://github.com/marklai1998/express-response-middleware/commit/dc5706214b62643893361e33fdb07075f549d402))
