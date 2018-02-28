<p align="center">
  <b style="font-size: 32px;">Kleros API</b>
</p>

<p align="center">
  <a href="https://badge.fury.io/js/kleros-api"><img src="https://badge.fury.io/js/kleros-api.svg" alt="NPM Version"></a>
  <a href="https://travis-ci.org/kleros/kleros-api"><img src="https://travis-ci.org/kleros/kleros-api.svg?branch=master" alt="Build Status"></a>
  <a href="https://coveralls.io/github/kleros/kleros-api?branch=master"><img src="https://coveralls.io/repos/github/kleros/kleros-api/badge.svg?branch=master" alt="Coverage Status"></a>
  <a href="https://david-dm.org/kleros/kleros-api"><img src="https://david-dm.org/kleros/kleros-api.svg" alt="Dependencies"></a>
  <a href="https://david-dm.org/kleros/kleros-api?type=dev"><img src="https://david-dm.org/kleros/kleros-api/dev-status.svg" alt="Dev Dependencies"></a>
  <a href="https://github.com/facebook/jest"><img src="https://img.shields.io/badge/tested_with-jest-99424f.svg" alt="Tested with Jest"></a>
  <a href="https://standardjs.com"><img src="https://img.shields.io/badge/code_style-standard-brightgreen.svg" alt="JavaScript Style Guide"></a>
  <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/styled_with-prettier-ff69b4.svg" alt="Styled with Prettier"></a>
  <a href="https://conventionalcommits.org"><img src="https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg" alt="Conventional Commits"></a>
  <a href="http://commitizen.github.io/cz-cli/"><img src="https://img.shields.io/badge/commitizen-friendly-brightgreen.svg" alt="Commitizen Friendly"></a>
</p>

> This repository contains a Javascript library that makes it easy to build Relayers and other DApps that use the Kleros protocol.

## Installation

We assume that you have node and yarn installed.

```sh
yarn install
```

## Test

```sh
yarn run ganache-cli
yarn test
```

## Develop

```sh
yarn start
```

## Build

```sh
yarn run build
```

## Event Listeners

For notifications and event based updates, the api uses event listeners. In order to register and start listening to events, use these methods:

##### Quick Start

To register all events and start the listener, call:

```sh
KlerosInstance.watchForEvents(arbitratorAddress, account, callback)
```

params:

* arbitratorAddress: Address of arbitrator contract. Needed to update the store for disputes.
* account: <optional> Address used for notification callbacks. If an address is provided, push notifications will only be sent for notifications that involve the address. If it is omitted and a callback is included, all notifications will be pushed.
* callback: <optional> Function to be called for push notifications.

##### Stop Listener

```sh
KlerosInstance.eventListener.stopWatchingArbitratorEvents(arbitratorAddress)
```
