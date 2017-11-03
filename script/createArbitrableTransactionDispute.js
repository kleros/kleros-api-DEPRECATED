import Kleros from '../src/Kleros'
import Web3 from 'web3'
import contract from 'truffle-contract'
import {LOCALHOST_ETH_PROVIDER, LOCALHOST_STORE_PROVIDER} from '../constants'
import config from '../config'

let arbitrableTransaction

let createArbitrableTransactionDispute = async contractAddress => {
  // use testRPC
  const provider = await new Web3.providers.HttpProvider(LOCALHOST_ETH_PROVIDER)
  const storeProvider = LOCALHOST_STORE_PROVIDER

  let KlerosInstance = await new Kleros(provider, storeProvider)

  const arbitrableTransaction = KlerosInstance.arbitrableTransaction
  console.log('loading contract...')
  let success = await arbitrableTransaction.load(contractAddress)
  if (!success) {
    return new Error('No contract found with address ' + contractAddress)
  }

  // pay dispute fees
  console.log('paying party A dispute fee...')
  let partyAFeeTxHash = await arbitrableTransaction.payArbitrationFeeByPartyA(
    undefined,
    contractAddress
  )
  console.log('tx hash: ' + partyAFeeTxHash)
  console.log('paying party B dispute fee...')
  let partyBFeeTxHash = await arbitrableTransaction.payArbitrationFeeByPartyB(
    undefined,
    contractAddress
  )
  console.log('tx hash: ' + partyBFeeTxHash)

  console.log('Dispute successfully started')
}

if (process.argv.length <= 2) {
    console.log("Usage: createArbitrableTransactionDispute CONTRACT_ADDRESS");
    process.exit(-1);
}

const contractAddress = process.argv[2];

createArbitrableTransactionDispute(contractAddress)
