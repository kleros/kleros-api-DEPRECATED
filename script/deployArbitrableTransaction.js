import Kleros from '../src/Kleros'
import Web3 from 'web3'
import contract from 'truffle-contract'
import {LOCALHOST_ETH_PROVIDER, LOCALHOST_STORE_PROVIDER} from '../constants'
import config from '../config'

let arbitrableTransaction

let deployArbitrableTransaction = async courtAddress => {
  // use testRPC
  const provider = await new Web3.providers.HttpProvider(LOCALHOST_ETH_PROVIDER)
  const storeProvider = LOCALHOST_STORE_PROVIDER

  let KlerosInstance = await new Kleros(provider, storeProvider)

  arbitrableTransaction = await KlerosInstance.arbitrableTransaction
  // deploy contract with defaults (testRPC + localhost addresses)
  console.log('deploying arbitratable transaction contract...')
  let arbitrableTransactionInstance = await arbitrableTransaction.deploy(
    undefined, //use default
    undefined, //use default
    courtAddress
  )
  console.log('contract address: ' + arbitrableTransactionInstance.address)
}

if (process.argv.length <= 2) {
    console.log('Usage: ' + __filename + ' COURT_ADDRESS');
    process.exit(-1);
}

const courtAddress = process.argv[2];

deployArbitrableTransaction(courtAddress)
