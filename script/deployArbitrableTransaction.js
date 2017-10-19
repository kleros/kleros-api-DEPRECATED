import Kleros from '../src/Kleros'
import Web3 from 'web3'
import contract from 'truffle-contract'
import {LOCALHOST_PROVIDER} from '../constants'
import config from '../config'

let arbitrableTransaction

let deployArbitrableTransaction = async (courtAddress) => {
  // use testRPC
  const provider = await new Web3.providers.HttpProvider(LOCALHOST_PROVIDER)

  let KlerosInstance = await new Kleros(provider)

  arbitrableTransaction = await KlerosInstance.arbitrableTransaction
  // deploy contract with defaults (testRPC + localhost addresses)
  console.log("deploying arbitratable transaction contract...")
  let arbitrableTransactionAddress = await arbitrableTransaction.deploy(
    undefined, //use default
    undefined, //use default
    courtAddress
  )
  console.log("contract address: " + arbitrableTransactionAddress)
}

if (process.argv.length <= 2) {
    console.log("Usage: " + __filename + " COURT_ADDRESS");
    process.exit(-1);
}

const courtAddress = process.argv[2];

deployArbitrableTransaction(courtAddress)
