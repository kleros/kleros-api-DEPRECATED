# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="0.0.67"></a>
## [0.0.67](https://github.com/kleros/kleros-api/compare/v0.0.65...v0.0.67) (2018-03-07)


### Bug Fixes

* **disputes:** fix bug in determining canRule ([49e2fc2](https://github.com/kleros/kleros-api/commit/49e2fc2))
* check session of jurors last vote ([bf4fde5](https://github.com/kleros/kleros-api/commit/bf4fde5))
* fix test on develop ([8f361c8](https://github.com/kleros/kleros-api/commit/8f361c8))



<a name="0.0.66"></a>
## [0.0.66](https://github.com/kleros/kleros-api/compare/v0.0.65...v0.0.66) (2018-03-07)


### Bug Fixes

* fix test on develop ([8f361c8](https://github.com/kleros/kleros-api/commit/8f361c8))
* **disputes:** fix bug in determining canRule ([6628fb7](https://github.com/kleros/kleros-api/commit/6628fb7))



<a name="0.0.65"></a>
## [0.0.65](https://github.com/kleros/kleros-api/compare/v0.0.62...v0.0.65) (2018-03-05)


### Bug Fixes

* **kleros-wrapper:** use correct index for juror.atStake ([143bbc0](https://github.com/kleros/kleros-api/commit/143bbc0)), closes [#63](https://github.com/kleros/kleros-api/issues/63)
* **notifications:** make sure appeal possible notifications unique ([30ea202](https://github.com/kleros/kleros-api/commit/30ea202))


### Features

* **disputes:** all functions working with new structure ([66541a6](https://github.com/kleros/kleros-api/commit/66541a6))
* **disputes:** DRY out fetch open disputes for session and add deadline event handler ([77b21ce](https://github.com/kleros/kleros-api/commit/77b21ce))
* **disputes:** skeleton for new dispute data ([0b99b55](https://github.com/kleros/kleros-api/commit/0b99b55))



<a name="0.0.64"></a>
## [0.0.64](https://github.com/kleros/kleros-api/compare/v0.0.62...v0.0.64) (2018-03-05)


### Bug Fixes

* **notifications:** make sure appeal possible notifications unique ([b7c55e6](https://github.com/kleros/kleros-api/commit/b7c55e6))


### Features

* **disputes:** all functions working with new structure ([66541a6](https://github.com/kleros/kleros-api/commit/66541a6))
* **disputes:** DRY out fetch open disputes for session and add deadline event handler ([77b21ce](https://github.com/kleros/kleros-api/commit/77b21ce))
* **disputes:** skeleton for new dispute data ([0b99b55](https://github.com/kleros/kleros-api/commit/0b99b55))



<a name="0.0.63"></a>

## [0.0.63](https://github.com/kleros/kleros-api/compare/v0.0.62...v0.0.63) (2018-03-05)

### Features

* **disputes:** all functions working with new structure ([39e9b2c](https://github.com/kleros/kleros-api/commit/39e9b2c))
* **disputes:** DRY out fetch open disputes for session and add deadline event handler ([c66548a](https://github.com/kleros/kleros-api/commit/c66548a))
* **disputes:** skeleton for new dispute data ([2382e39](https://github.com/kleros/kleros-api/commit/2382e39))

<a name="0.0.62"></a>

## 0.0.62 (2018-02-28)

### Bug Fixes

* **getDeadlineForDispute:** fix wrong computation and return date object ([7ee05f5](https://github.com/kleros/kleros-api/commit/7ee05f5))
* skip broken test assertions ([d210c53](https://github.com/kleros/kleros-api/commit/d210c53))
* test suite ([98b777d](https://github.com/kleros/kleros-api/commit/98b777d))

### Features

* normalize token units ([d0d40f8](https://github.com/kleros/kleros-api/commit/d0d40f8))
* **disputes:** build voteCounters and PNKRepartitions from getters ([ba48e67](https://github.com/kleros/kleros-api/commit/ba48e67))
* **disputes:** change approach to getting netPNK and votesCounter ([366340f](https://github.com/kleros/kleros-api/commit/366340f))
* **disputes:** createdAt and ruledAt timestamps added in events ([8e9cafa](https://github.com/kleros/kleros-api/commit/8e9cafa))
* **disputes:** remove netPNK until events are fixed ([255bf03](https://github.com/kleros/kleros-api/commit/255bf03))
* **disputes:** return appealsRepartitioned ([1246968](https://github.com/kleros/kleros-api/commit/1246968))
* **disputes:** return deadline as epoch in ms instead of a date object ([90d4856](https://github.com/kleros/kleros-api/commit/90d4856))
* **disputes:** return dispute status ([32db45c](https://github.com/kleros/kleros-api/commit/32db45c))
* **disputes:** submittedAt timestamp for evidence ([3656d33](https://github.com/kleros/kleros-api/commit/3656d33))

<a name="0.0.61"></a>

## 0.0.61 (2018-02-27)

### Bug Fixes

* **getDeadlineForDispute:** fix wrong computation and return date object ([7ee05f5](https://github.com/kleros/kleros-api/commit/7ee05f5))
* skip broken test assertions ([f9480c0](https://github.com/kleros/kleros-api/commit/f9480c0))
* test suite ([98b777d](https://github.com/kleros/kleros-api/commit/98b777d))

### Features

* normalize token units ([d0d40f8](https://github.com/kleros/kleros-api/commit/d0d40f8))
* **disputes:** build voteCounters and PNKRepartitions from getters ([ba48e67](https://github.com/kleros/kleros-api/commit/ba48e67))
* **disputes:** change approach to getting netPNK and votesCounter ([366340f](https://github.com/kleros/kleros-api/commit/366340f))
* **disputes:** remove netPNK until events are fixed ([255bf03](https://github.com/kleros/kleros-api/commit/255bf03))
* **disputes:** return appealsRepartitioned ([1246968](https://github.com/kleros/kleros-api/commit/1246968))
* **disputes:** return deadline as epoch in ms instead of a date object ([90d4856](https://github.com/kleros/kleros-api/commit/90d4856))
* **disputes:** return dispute status ([32db45c](https://github.com/kleros/kleros-api/commit/32db45c))
