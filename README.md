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

## Docs
Generate esdocs
```
yarn generate-docs
```

Open documentation UI
```
yarn docs
```

## Event Listeners

For notifications and event based updates the api uses event listeners. In order to register and start listening to events use these commands:

##### Quick Start
To register all events and start the listener call
```
KlerosInstance.watchForEvents(arbitratorAddress, account, callback)
```
params:

- arbitratorAddress: address of arbitrator contract. Needed to update store for disputes
- account: <optional> address used for notification callbacks. If an address is provided push notifications will only be sent for notifications that involve the address. If it is omitted and a callback is included all notifications will be pushed.
- callback: <optional> function to be called for push notifications

##### Stop Listener
```
KlerosInstance.eventListener.stopWatchingArbitratorEvents(arbitratorAddress)
```
