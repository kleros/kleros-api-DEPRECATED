import Kleros from './Kleros'
import Web3 from 'web3'
import contract from 'truffle-contract'
import {LOCALHOST_PROVIDER} from '../constants'
import config from '../config'
import mockDisputes from '../contract_wrapper/mockDisputes'


describe('Kleros', () => {
  let court
  let centralCourt
  let arbitrableTransaction

  beforeAll(async () => {
    // use testRPC
    const provider = await new Web3.providers.HttpProvider(LOCALHOST_PROVIDER)

    let KlerosInstance = await new Kleros(provider)

    court = await KlerosInstance.court
    centralCourt = await KlerosInstance.centralCourt
    arbitrableTransaction = await KlerosInstance.arbitrableTransaction
  })

  test('deploy a arbitrableTransaction contract', async () => {
    let centralCourtDeployed = await centralCourt.deploy()
    expect(centralCourtDeployed.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash


    let contractArbitrableTransactionAddress = await arbitrableTransaction.deploy(
      undefined, // use default account : account[0]
      undefined, // use default value : 0
      centralCourtDeployed.address
    )
    expect(contractArbitrableTransactionAddress.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  })

  test('get disputes', async () => {
    let disputesKleros = await court.getDisputes()

    expect(mockDisputes).toEqual(disputesKleros);
  })

  test('get dispute by id', async () => {
    const testDispute = mockDisputes[0]
    let disputeKleros = await court.getDisputeById(testDispute.caseId)

    expect(testDispute).toEqual(disputeKleros);
  })
})
