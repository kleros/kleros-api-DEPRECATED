# Kleros API

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

> This repository contains a Javascript library that provides methods to interact with Kleros arbitrator
  and Arbitrable contracts. It can be used to develop Relayers or DApps that use Kleros smart contracts.

## Installation
```
yarn add kleros-api
```

## Basic Usage

See the full API docs [here](https://kleros.io/kleros-api/).

The base Kleros object initializes all of the different kleros api's with the contract
addresses you pass. This object is useful if your application interacts with both arbitrators,
arbitrable contracts and uses an off chain store to provide metadata on the different disputes
for the UI.

```
// pay arbitration fee.
import Kleros from 'kleros-api'

const KlerosInstance = new Kleros(
  ETH_PROVIDER, // ethereum provider object
  KLEROS_STORE_URI, // uri of off chain storage e.g. https://kleros.in
  ARITRATOR_CONTRACT_ADDRESS, // address of a deployed Kleros arbitrator contract
  ARBITRABLE_CONTRACT_ADDRESS // address of a deployed arbitrable transaction contract
)

KlerosInstance.arbitrable.payArbitrationFeeByPartyA() // pay arbitration fee for an arbitrable contract
```

You can also use the specific api that best suits your needs.

```
// deploy a new contract and pay the arbitration fee.
import ArbitrableTransaction from 'kleros-api/contracts/implementations/arbitrable/ArbitrableTransaction'

// deploy methods are static
const contractInstance = ArbitrableTransaction.deploy(
    "0x67a3f2BB8B4B2060875Bd6543156401B817bEd22", // users address
    0.15, // amount of ETH to escrow
    "0x0", // hash of the off chain contract
    "0x3af76ef44932695a33ba2af52018cd24a74c904f", // arbitrator address
    3600, // number of seconds until there is a timeout
    "0x0474b723bd4986808366E0DcC2E301515Aa742B4", // the other party in the contract
    "0x0", // extra data in bytes. This can be used to interact with the arbitrator contract
    ETH_PROVIDER, // provider object to be used to interact with the network
  )

const address = contractInstance.address // get the address of your newly created contract

const ArbitrableTransactionInstance = new ArbitrableTransaction(address) // instantiate instance of the api

ArbitrableTransactionInstance.payArbitrationFeeByPartyA() // pay arbitration fee
```

## Development

If you want to contribute to our api or modify it for your usage

## Setup

We assume that you have node and yarn installed.

```sh
yarn install
```

## Test

```sh
yarn run ganache-cli
yarn test
```

## Build

```sh
yarn run build
```
