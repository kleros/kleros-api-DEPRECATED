# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="0.4.0"></a>
# [0.4.0](https://github.com/kleros/kleros-api/compare/v0.3.0...v0.4.0) (2018-05-09)


### Bug Fixes

* **doc:** change ganache set up to have more accounts ([baf5e24](https://github.com/kleros/kleros-api/commit/baf5e24))
* **test:** err msg ([f2e838d](https://github.com/kleros/kleros-api/commit/f2e838d))


### Features

* **all:** cleanup for the demo ([0dc14e1](https://github.com/kleros/kleros-api/commit/0dc14e1))



<a name="0.3.0"></a>
# [0.3.0](https://github.com/kleros/kleros-api/compare/v0.2.5...v0.3.0) (2018-04-18)


### Features

* add getDataFromStore to abstractions/Arbitrable ([54e65ba](https://github.com/kleros/kleros-api/commit/54e65ba))



<a name="0.2.5"></a>
## [0.2.5](https://github.com/kleros/kleros-api/compare/v0.2.4...v0.2.5) (2018-04-18)


### Bug Fixes

* bug fixes while updating UI ([f4c7d7c](https://github.com/kleros/kleros-api/commit/f4c7d7c))



<a name="0.2.4"></a>
## [0.2.4](https://github.com/kleros/kleros-api/compare/v0.2.3...v0.2.4) (2018-04-13)



<a name="0.2.3"></a>
## [0.2.3](https://github.com/kleros/kleros-api/compare/v0.2.2...v0.2.3) (2018-04-13)



<a name="0.2.2"></a>
## [0.2.2](https://github.com/kleros/kleros-api/compare/v0.2.1...v0.2.2) (2018-04-13)


### Bug Fixes

* **constants:** move constants into src and exclude from esdocs ([4a510bb](https://github.com/kleros/kleros-api/commit/4a510bb))



<a name="0.2.1"></a>
## [0.2.1](https://github.com/kleros/kleros-api/compare/v0.0.70...v0.2.1) (2018-04-12)


### Bug Fixes

* **disputes unit test:** use custom try/catch for test of getUserDisputeFromStore ([cb386f1](https://github.com/kleros/kleros-api/commit/cb386f1))
* imports and lints for new contract structure ([19c0461](https://github.com/kleros/kleros-api/commit/19c0461))
* improper capitalization on imports ([2ff95b8](https://github.com/kleros/kleros-api/commit/2ff95b8))
* **StoreProviderWrapper:** revert to passing named params for addEvidenceContract ([fc61444](https://github.com/kleros/kleros-api/commit/fc61444))


### Features

* throw semantic errors ([bf76f4a](https://github.com/kleros/kleros-api/commit/bf76f4a)), closes [#107](https://github.com/kleros/kleros-api/issues/107) [kleros/kleros-juror-front#10](https://github.com/kleros/kleros-juror-front/issues/10)
* **all:** require params in wrappers. fix how StateFullContract wrapper loads ([1478e3e](https://github.com/kleros/kleros-api/commit/1478e3e))
* **EventListener:** all methods take contract implementation object ([4a89382](https://github.com/kleros/kleros-api/commit/4a89382))
* update doc strings ([f5baccc](https://github.com/kleros/kleros-api/commit/f5baccc))



<a name="0.2.0"></a>

# [0.2.0](https://github.com/kleros/kleros-api/compare/v0.0.70...v0.2.0) (2018-03-29)

### Bug Fixes

* **disputes unit test:** use custom try/catch for test of getUserDisputeFromStore ([cb386f1](https://github.com/kleros/kleros-api/commit/cb386f1))
* improper capitalization on imports ([ecf14ae](https://github.com/kleros/kleros-api/commit/ecf14ae))

### Features

* throw semantic errors ([bf76f4a](https://github.com/kleros/kleros-api/commit/bf76f4a)), closes [#107](https://github.com/kleros/kleros-api/issues/107) [kleros/kleros-juror-front#10](https://github.com/kleros/kleros-juror-front/issues/10)

<a name="0.1.0"></a>

# [0.1.0](https://github.com/kleros/kleros-api/compare/v0.0.70...v0.1.0) (2018-03-27)

### Bug Fixes

* **disputes unit test:** use custom try/catch for test of getUserDisputeFromStore ([b10ca1a](https://github.com/kleros/kleros-api/commit/b10ca1a))

### Features

* throw semantic errors ([bf76f4a](https://github.com/kleros/kleros-api/commit/bf76f4a)), closes [#107](https://github.com/kleros/kleros-api/issues/107) [kleros/kleros-juror-front#10](https://github.com/kleros/kleros-juror-front/issues/10)

<a name="0.0.70"></a>

## [0.0.70](https://github.com/kleros/kleros-api/compare/v0.0.69...v0.0.70) (2018-03-16)

### Bug Fixes

* **notifications:** error in stateful notifications ([2155f60](https://github.com/kleros/kleros-api/commit/2155f60))

<a name="0.0.69"></a>

## [0.0.69](https://github.com/kleros/kleros-api/compare/v0.0.68...v0.0.69) (2018-03-15)

### Bug Fixes

* untranspiled files outside src directory ([83f1d59](https://github.com/kleros/kleros-api/commit/83f1d59))

<a name="0.0.68"></a>

## [0.0.68](https://github.com/kleros/kleros-api/compare/v0.0.65...v0.0.68) (2018-03-15)

### Bug Fixes

* **disputes:** fix bug in determining canRule ([49e2fc2](https://github.com/kleros/kleros-api/commit/49e2fc2))
* check session of jurors last vote ([72645a0](https://github.com/kleros/kleros-api/commit/72645a0))
* fix test on develop ([8f361c8](https://github.com/kleros/kleros-api/commit/8f361c8))
* **disputes:** wait for getDispute and getData in getDataForDispute ([d13f307](https://github.com/kleros/kleros-api/commit/d13f307))
* revert event.\_args.disputeId to event.\_args.disputeID ([c722a04](https://github.com/kleros/kleros-api/commit/c722a04))

### Features

* **contract-wrapper:** estimate gas on all transactions ([34d92fe](https://github.com/kleros/kleros-api/commit/34d92fe))
* **contract-wrapper:** first pass at using estimate gas ([e455c55](https://github.com/kleros/kleros-api/commit/e455c55))
* **disputes:** fetch session and period inside getDataForDispute and change var names ([9c08d20](https://github.com/kleros/kleros-api/commit/9c08d20))
* **disputes:** implement canRepartition and canExecute ([7e7f68f](https://github.com/kleros/kleros-api/commit/7e7f68f))

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
