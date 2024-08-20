# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.14.0](https://github.com/dvcol/base-http-client/compare/v1.13.1...v1.14.0) (2024-08-20)


### Features

* **cache:** allows eviction key extension ([3b3f2c6](https://github.com/dvcol/base-http-client/commit/3b3f2c6336ba9b6af1b1e14f6e1a73a2dcc95c26))

### [1.13.1](https://github.com/dvcol/base-http-client/compare/v1.13.0...v1.13.1) (2024-08-18)


### Bug Fixes

* **error:** update default messages ([b6318cd](https://github.com/dvcol/base-http-client/commit/b6318cd8fa6d207d664152dde644d720a753d962))

## [1.13.0](https://github.com/dvcol/base-http-client/compare/v1.12.2...v1.13.0) (2024-08-18)


### Features

* **error:** adds error and validator utils ([2ec9b7c](https://github.com/dvcol/base-http-client/commit/2ec9b7c3c570ab8afb258e60c5aac56b6cc7954d))

### [1.12.2](https://github.com/dvcol/base-http-client/compare/v1.12.1...v1.12.2) (2024-08-13)


### Bug Fixes

* **utils:** correct typo in injectCorsProxy ([c5f2e86](https://github.com/dvcol/base-http-client/commit/c5f2e862086bf3126a0f30d7fdf644ee967d19fd))

### [1.12.1](https://github.com/dvcol/base-http-client/compare/v1.12.0...v1.12.1) (2024-08-13)


### Bug Fixes

* **utils:** inject prefix in a immutable way ([818d26b](https://github.com/dvcol/base-http-client/commit/818d26bfab711d41e6c66c57a2a4460971cfa286))

## [1.12.0](https://github.com/dvcol/base-http-client/compare/v1.11.0...v1.12.0) (2024-08-11)


### Features

* **headers:** adds authenticate header to utils ([f369b5f](https://github.com/dvcol/base-http-client/commit/f369b5fab627ef2f83e070497eaf0352926b20c4))

## [1.11.0](https://github.com/dvcol/base-http-client/compare/v1.10.0...v1.11.0) (2024-08-07)


### Features

* **utils:** adds response patch utils ([88f35f9](https://github.com/dvcol/base-http-client/commit/88f35f916916548ae99a92eeb8ae1775040506d3))

## [1.10.0](https://github.com/dvcol/base-http-client/compare/v1.9.1...v1.10.0) (2024-06-23)


### Features

* **base-client:** adds basic implementations of requires methods ([5bef0dd](https://github.com/dvcol/base-http-client/commit/5bef0ddd917bebf21fb1daa1ddef8711919ceb2b))

### [1.9.1](https://github.com/dvcol/base-http-client/compare/v1.9.0...v1.9.1) (2024-06-18)


### Bug Fixes

* **cache:** adds template & params transform in cache key generation ([bace3c1](https://github.com/dvcol/base-http-client/commit/bace3c186fffb054ff31bab3e43ad59c22133b54))

## [1.9.0](https://github.com/dvcol/base-http-client/compare/v1.8.1...v1.9.0) (2024-06-18)


### Features

* **content-type:** support more body types and headers ([15bb03a](https://github.com/dvcol/base-http-client/commit/15bb03adc07b160bb0e83c5c0cd2064414fb3d29))

### [1.8.1](https://github.com/dvcol/base-http-client/compare/v1.8.0...v1.8.1) (2024-06-15)


### Bug Fixes

* **base-client:** broaden key binding & fix body parsing ([9aa8d03](https://github.com/dvcol/base-http-client/commit/9aa8d033b966cc536e7c575ab69a137c728ffdf3))

## [1.8.0](https://github.com/dvcol/base-http-client/compare/v1.7.1...v1.8.0) (2024-06-14)


### Features

* **base-client:** pass additional context to parse response ([9b10d59](https://github.com/dvcol/base-http-client/commit/9b10d5934714da197b89a3a4a578cb8cea526482))

### [1.7.1](https://github.com/dvcol/base-http-client/compare/v1.7.0...v1.7.1) (2024-06-14)


### Bug Fixes

* **type:** loosen typing to make extending easier ([6253f64](https://github.com/dvcol/base-http-client/commit/6253f64dd9328e2401a1ff26c236c3388bfaab45))

## [1.7.0](https://github.com/dvcol/base-http-client/compare/v1.6.0...v1.7.0) (2024-06-14)


### Features

* **base-client:** adds generic transform method to mutate template ([41bd812](https://github.com/dvcol/base-http-client/commit/41bd81220054b83ebfdd8c518028c937f8a307c0))

## [1.6.0](https://github.com/dvcol/base-http-client/compare/v1.5.1...v1.6.0) (2024-06-14)


### Features

* **base-client:**  make param in url optional if declared in template ([524bd0e](https://github.com/dvcol/base-http-client/commit/524bd0e8fd9bd77313a0e4037eccc3ec6d51d78f))

### [1.5.1](https://github.com/dvcol/base-http-client/compare/v1.5.0...v1.5.1) (2024-06-13)


### Bug Fixes

* **build:** exclude spec from bundle ([2445d06](https://github.com/dvcol/base-http-client/commit/2445d06cc6cc60f2d2898deb5f6267982f5b8cda))

## [1.5.0](https://github.com/dvcol/base-http-client/compare/v1.4.2...v1.5.0) (2024-06-13)


### Features

* **deps:** move to common-utils package ([3c4880b](https://github.com/dvcol/base-http-client/commit/3c4880b387f9b761b05ed70e12d98cff0cd4a257))

### [1.4.2](https://github.com/dvcol/base-http-client/compare/v1.4.1...v1.4.2) (2024-06-12)


### Bug Fixes

* **cache:** allow promise chaining of cancellable promises ([32bd803](https://github.com/dvcol/base-http-client/commit/32bd8037106776344e7a0351ae7f0eaadad0eac9))

### [1.4.1](https://github.com/dvcol/base-http-client/compare/v1.4.0...v1.4.1) (2024-06-12)


### Bug Fixes

* **cache:** return cancellable promise form cache functions ([f32d816](https://github.com/dvcol/base-http-client/commit/f32d81627cbbdf22811a9595431e70453b12bdef))

## [1.4.0](https://github.com/dvcol/base-http-client/compare/v1.3.0...v1.4.0) (2024-06-12)


### Features

* **client:** expose cancellable api to downstream clients ([a7d525e](https://github.com/dvcol/base-http-client/commit/a7d525e7defeaf87f1b8d5fb03c8642055e1ac4e))

## [1.3.0](https://github.com/dvcol/base-http-client/compare/v1.2.0...v1.3.0) (2024-06-04)


### Features

* **body:** adds raw json parsing body function ([f75da44](https://github.com/dvcol/base-http-client/commit/f75da441293b0394944f9f75112fa4c61b71a635))
* **seed:** add parameter seed ([210c33c](https://github.com/dvcol/base-http-client/commit/210c33c240c7f5c1cd4c80612dc5d32efbb14e8f))

## [1.2.0](https://github.com/dvcol/base-http-client/compare/v1.1.2...v1.2.0) (2024-05-14)


### Features

* **headers:** adds additional default mime types ([1d0d15e](https://github.com/dvcol/base-http-client/commit/1d0d15ef86b76d8f015e2c5d82a1494f96128ebb))

### [1.1.2](https://github.com/dvcol/base-http-client/compare/v1.1.1...v1.1.2) (2024-05-12)


### Bug Fixes

* **bundle:** restore splitting for mocking purposes ([ad24707](https://github.com/dvcol/base-http-client/commit/ad247074320bb489084b6ecb838429501d0c1db0))

### [1.1.1](https://github.com/dvcol/base-http-client/compare/v1.1.0...v1.1.1) (2024-05-12)


### Bug Fixes

* **bundle:** remove splitting ([10b78dd](https://github.com/dvcol/base-http-client/commit/10b78dd567b328718198aaa2d74dab5ae5ce9e77))

## 1.1.0 (2024-05-11)


### Features

* initial commit ([7819d71](https://github.com/dvcol/typescript-lib-template/commit/7819d71634713bc53cfd22527729c57e30f772c3))
