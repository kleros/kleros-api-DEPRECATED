# Kleros


[![Build Status](https://travis-ci.org/kleros/kleros-api.svg?branch=master)](https://travis-ci.org/kleros/kleros-api) [![Join the chat at https://gitter.im/kleros/kleros-api](https://badges.gitter.im/kleros/kleros-api.svg)](https://gitter.im/kleros/kleros-api?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![npm version](https://badge.fury.io/js/kleros-api.svg)](https://badge.fury.io/js/kleros-api) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/standard/standard)

This repository contains a Javascript library that makes it easy to build Relayers and other DApps that use the Kleros protocol.

## Installation

We assume that you have npm and yarn installed.

```
yarn install
```

## Build

```
yarn build
```

## Deploy

```
yarn deploy
```

## Test

Testrpc must be installed (https://github.com/ethereumjs/testrpc).

```
testrpc
yarn test
```

## Smart contract commands (testrpc)

```
yarn deployCentralCourt
yarn deployArbitrableTransaction
yarn createArbitrableTransactionDispute
yarn getDisputeDataFromCentralCourt
yarn getDataFromArbitrableTransaction
yarn postDataToStore
yarn getDataFromStore
yarn deployKlerosPOC
yarn buyPNK
yarn activatePNK
yarn passPeriod
yarn getDisputesForUser
```
