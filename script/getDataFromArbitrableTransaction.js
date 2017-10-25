import Kleros from '../src/Kleros'
import Web3 from 'web3'
import contract from 'truffle-contract'
import {LOCALHOST_ETH_PROVIDER, LOCALHOST_STORE_PROVIDER} from '../constants'
import config from '../config'

let arbitrableTransaction

let getDataFromArbitrableTransaction = async (contractAddress) => {
  // use testRPC
  const provider = await new Web3.providers.HttpProvider(LOCALHOST_ETH_PROVIDER)
  const storeProvider = LOCALHOST_STORE_PROVIDER

  let KlerosInstance = await new Kleros(provider, storeProvider)

  arbitrableTransaction = await KlerosInstance.arbitrableTransaction
  console.log('loading contract...')
  let data = await arbitrableTransaction.getDataContract(contractAddress)
  console.log(data)
}

if (process.argv.length <= 2) {
    console.log('Usage: createArbitrableTransactionDispute CONTRACT_ADDRESS DISPUTE_ID');
    process.exit(-1);
}

const contractAddress = process.argv[2];

getDataFromArbitrableTransaction(contractAddress)
