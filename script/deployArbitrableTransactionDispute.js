import Kleros from '../src/Kleros'
import Web3 from 'web3'
import contract from 'truffle-contract'
import {LOCALHOST_PROVIDER} from '../constants'
import config from '../config'

let arbitrableTransaction

let deployArbitrableTransactionDispute = async () => {
  // use testRPC
  const provider = await new Web3.providers.HttpProvider(LOCALHOST_PROVIDER)

  let KlerosInstance = await new Kleros(provider)

  arbitrableTransaction = await KlerosInstance.arbitrableTransaction
  // deploy contract with defaults (testRPC + localhost addresses)
  // TODO use KlerosPOC contract for arbitrator
  console.log("deploying contract")
  let arbitrableTransactionAddress = await arbitrableTransaction.deploy()
  console.log(arbitrableTransactionAddress)

  // pay dispute fees
  console.log("pay fees")
  let partyAFeeTxHash = await arbitrableTransaction.payArbitrationFeeByPartyA()
  console.log(partyAFeeTxHash)
  let partyBFeeTxHash = await arbitrableTransaction.payArbitrationFeeByPartyB()
  console.log(partyBFeeTxHash)

  // get dispute from blockchain
  let dispute = await KlerosInstance.court.getDisputeById(arbitrableTransactionAddress)
  console.log("yay")
}

deployArbitrableTransactionDispute()
