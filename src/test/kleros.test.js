import Kleros from '../Kleros'
import Web3 from 'web3'
import contract from 'truffle-contract'
import {LOCALHOST_PROVIDER} from '../../constants'
import config from '../../config'
import mockDisputes from '../../contract_wrapper/mockDisputes'


describe('Kleros', () => {
  let partyA
  let partyB
  let web3
  let court
  let centralCourt
  let arbitrableTransaction

  beforeAll(async () => {
    // use testRPC
    const provider = await new Web3.providers.HttpProvider(LOCALHOST_PROVIDER)

    let KlerosInstance = await new Kleros(provider)

    web3 = await new Web3(provider)

    partyA = web3.eth.accounts[0]
    partyB = web3.eth.accounts[1]

    court = await KlerosInstance.court
    centralCourt = await KlerosInstance.centralCourt
    arbitrableTransaction = await KlerosInstance.arbitrableTransaction
  })

  test('deploy a arbitrableTransaction contract', async () => {
    let centralCourtDeployed = await centralCourt.deploy()
    expect(centralCourtDeployed.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash


    let contractArbitrableTransactionAddress = await arbitrableTransaction
      .deploy(
        undefined, // use default account : account[0]
        undefined, // use default value : 0
        centralCourtDeployed.address
      )

    expect(contractArbitrableTransactionAddress.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  }, 10000)

  test('get data of a arbitrableTransaction contract', async () => {
    let centralCourtDeployed = await centralCourt.deploy()

    let contractData = {
      arbitrator: centralCourtDeployed.address,
      timeout: 3600,
      partyA,
      partyB,
      arbitratorExtraData: '0x',
      status: 0
    }

    contractData.email = 'email'
    contractData.description = 'desc'
    contractData.disputeId = 0

    let contractArbitrableTransaction = await arbitrableTransaction.deploy(
      undefined, // use default account : account[0]
      undefined, // use default value : 0
      contractData.arbitrator,
      contractData.partyA,
      contractData.timeout,
      contractData.partyB,
      contractData.arbitratorExtraData,
      'email',
      'desc'
    )

    const contractDataDeployed = await arbitrableTransaction
      .getDataContract(contractArbitrableTransaction.address)

    contractDataDeployed.disputeId = contractDataDeployed.disputeId.toNumber()

    expect(contractDataDeployed)
      .toEqual(contractData)
  }, 10000)

  test('partyA create a dispute', async () => {
    let centralCourtDeployed = await centralCourt.deploy()

    let contractData = {
      arbitrator: centralCourtDeployed.address,
      timeout: 3600,
      partyA,
      partyB,
      arbitratorExtraData: 0,
      status: 0,
    }

    let contractArbitrableTransaction = await arbitrableTransaction.deploy(
      undefined, // use default account : account[0]
      undefined, // use default value : 0
      contractData.arbitrator,
      contractData.partyA,
      contractData.timeout,
      contractData.partyB,
      contractData.arbitratorExtraData,
      'email',
      'description'
    )

    const partyAFeeContractInstance = await contractArbitrableTransaction
      .partyAFee()

    const arbitrationCost = await centralCourtDeployed.arbitrationCost(
      partyAFeeContractInstance.toNumber()
   )

    // use default parameters
    // account: accounts[0]
    // arbitration cost: 150000000000000000 wei
    const txHashRaiseDisputeByPartyA = await arbitrableTransaction
      .payArbitrationFeeByPartyA(
        undefined,
        contractArbitrableTransaction.address,
        web3.fromWei(arbitrationCost - partyAFeeContractInstance, 'ether')
      )

    expect(txHashRaiseDisputeByPartyA)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  }, 10000)
})
