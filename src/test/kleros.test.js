import Kleros from '../kleros'
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
  let rng
  let pinakion

  beforeAll(async () => {
    // use testRPC
    const provider = await new Web3.providers.HttpProvider(LOCALHOST_PROVIDER)

    let KlerosInstance = await new Kleros(provider)

    web3 = await new Web3(provider)

    partyA = web3.eth.accounts[0]
    partyB = web3.eth.accounts[1]

    court = await KlerosInstance.court
    rng = await KlerosInstance.rng
    pinakion = await KlerosInstance.pinakion
    centralCourt = await KlerosInstance.centralCourt
    arbitrableTransaction = await KlerosInstance.arbitrableTransaction
  })

  // test('deploy a arbitrableTransaction contract', async () => {
  //   let centralCourtDeployed = await centralCourt.deploy()
  //   expect(centralCourtDeployed.transactionHash)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //
  //
  //   let contractArbitrableTransactionAddress = await arbitrableTransaction
  //     .deploy(
  //       undefined, // use default account : account[0]
  //       undefined, // use default value : 0
  //       centralCourtDeployed.address
  //     )
  //
  //   expect(contractArbitrableTransactionAddress.transactionHash)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  // }, 10000)
  //
  // test('get data of a arbitrableTransaction contract', async () => {
  //   let centralCourtDeployed = await centralCourt.deploy()
  //
  //   let contractData = {
  //     arbitrator: centralCourtDeployed.address,
  //     timeout: 3600,
  //     partyA,
  //     partyB,
  //     arbitratorExtraData: '0x',
  //     status: 0
  //   }
  //
  //   contractData.email = 'email'
  //   contractData.description = 'desc'
  //   contractData.disputeId = 0
  //
  //   let contractArbitrableTransaction = await arbitrableTransaction.deploy(
  //     undefined, // use default account : account[0]
  //     undefined, // use default value : 0
  //     contractData.arbitrator,
  //     contractData.partyA,
  //     contractData.timeout,
  //     contractData.partyB,
  //     contractData.arbitratorExtraData,
  //     'email',
  //     'desc'
  //   )
  //
  //   const contractDataDeployed = await arbitrableTransaction
  //     .getDataContract(contractArbitrableTransaction.address)
  //
  //   contractDataDeployed.disputeId = contractDataDeployed.disputeId.toNumber()
  //
  //   expect(contractDataDeployed)
  //     .toEqual(contractData)
  // }, 10000)
  //
  // test('partyA create a dispute', async () => {
  //   let centralCourtDeployed = await centralCourt.deploy()
  //
  //   let contractData = {
  //     arbitrator: centralCourtDeployed.address,
  //     timeout: 3600,
  //     partyA,
  //     partyB,
  //     arbitratorExtraData: 0x00,
  //     status: 0,
  //   }
  //
  //   let contractArbitrableTransaction = await arbitrableTransaction.deploy(
  //     undefined, // use default account : account[0]
  //     undefined, // use default value : 0
  //     contractData.arbitrator,
  //     contractData.partyA,
  //     contractData.timeout,
  //     contractData.partyB,
  //     contractData.arbitratorExtraData,
  //     'email',
  //     'description'
  //   )
  //
  //   // return a bigint
  //   const partyAFeeContractInstance = await contractArbitrableTransaction
  //     .partyAFee()
  //
  //   // return bytes
  //   let extraDataContractInstance = await contractArbitrableTransaction
  //     .arbitratorExtraData()
  //
  //   if (extraDataContractInstance === undefined)
  //     extraDataContractInstance = 0
  //
  //   // return a bigint with the default value : 10000 wei fees
  //   const arbitrationCost = await centralCourtDeployed
  //     .arbitrationCost(partyAFeeContractInstance.toNumber())
  //
  //
  //   // use default parameters
  //   // account: accounts[0]
  //   // arbitration cost: 10000 wei
  //   const txHashRaiseDisputeByPartyA = await arbitrableTransaction
  //     .payArbitrationFeeByPartyA(
  //       undefined,
  //       contractArbitrableTransaction.address,
  //       web3.fromWei(arbitrationCost - partyAFeeContractInstance.toNumber(), 'ether')
  //     )
  //   //
  //   expect(txHashRaiseDisputeByPartyA)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //
  //   // return a bigint
  //   const partyBFeeContractInstance = await contractArbitrableTransaction
  //     .partyBFee()
  //
  //   // use default parameters
  //   // account: accounts[0]
  //   // arbitration cost: 10000 wei
  //   const txHashRaiseDisputeByPartyB = await arbitrableTransaction
  //     .payArbitrationFeeByPartyB(
  //       undefined,
  //       contractArbitrableTransaction.address,
  //       web3.fromWei(arbitrationCost - partyBFeeContractInstance.toNumber(), 'ether')
  //     )
  //   //
  //   expect(txHashRaiseDisputeByPartyB)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //
  //   // TODO fix this
  //   // const dispute = await centralCourtDeployed.disputes(0)
  //   //
  //   // expect(dispute[0])
  //   //   .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  // }, 10000)

  // test('buy pinakion', async () => {
  //   const rngInstance = await rng.deploy()
  //   expect(rngInstance.transactionHash)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //   const pinakionInstance = await pinakion.deploy()
  //   expect(pinakionInstance.transactionHash)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //   const klerosCourt = await court.deploy(rngInstance.address, pinakionInstance.address)
  //   expect(klerosCourt.transactionHash)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //
  //   // transfer ownership and set kleros instance
  //   let data = await pinakion.setKleros(pinakionInstance.address, klerosCourt.address)
  //   expect(data.kleros).toEqual(klerosCourt.address)
  //   data = await pinakion.transferOwnership(pinakionInstance.address, klerosCourt.address)
  //   expect(data.owner).toEqual(klerosCourt.address)
  //
  //   // should have no balance to start with
  //   const initialBalance = await court.getPNKBalance(klerosCourt.address)
  //   expect(initialBalance.tokenBalance).toEqual('0')
  //
  //   // buy 1 PNK
  //   const newBalance = await court.buyPNK(1, klerosCourt.address)
  //   expect(newBalance.tokenBalance).toEqual('1')
  // }, 10000)
  //
  // test('activate pinakion', async () => {
  //   const rngInstance = await rng.deploy()
  //   expect(rngInstance.transactionHash)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //   const pinakionInstance = await pinakion.deploy()
  //   expect(pinakionInstance.transactionHash)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //   const klerosCourt = await court.deploy(rngInstance.address, pinakionInstance.address)
  //   expect(klerosCourt.transactionHash)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //
  //   // transfer ownership and set kleros instance
  //   let data = await pinakion.setKleros(pinakionInstance.address, klerosCourt.address)
  //   expect(data.kleros).toEqual(klerosCourt.address)
  //   data = await pinakion.transferOwnership(pinakionInstance.address, klerosCourt.address)
  //   expect(data.owner).toEqual(klerosCourt.address)
  //
  //   // buy 1 PNK
  //   let balance = await court.buyPNK(1, klerosCourt.address)
  //   expect(balance.tokenBalance).toEqual('1')
  //   expect(balance.activatedTokens).toEqual('0')
  //
  //   // activate PNK
  //   balance = await court.activatePNK(0.5, klerosCourt.address)
  //   expect(balance.tokenBalance).toEqual('1')
  //   expect(balance.activatedTokens).toEqual('0.5')
  // }, 10000)
  //
  // test('pass period', async () => {
  //   const rngInstance = await rng.deploy()
  //   expect(rngInstance.transactionHash)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //   const pinakionInstance = await pinakion.deploy()
  //   expect(pinakionInstance.transactionHash)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //   const klerosCourt = await court.deploy(rngInstance.address, pinakionInstance.address)
  //   expect(klerosCourt.transactionHash)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //
  //   // transfer ownership and set kleros instance
  //   let data = await pinakion.setKleros(pinakionInstance.address, klerosCourt.address)
  //   expect(data.kleros).toEqual(klerosCourt.address)
  //   data = await pinakion.transferOwnership(pinakionInstance.address, klerosCourt.address)
  //   expect(data.owner).toEqual(klerosCourt.address)
  //
  //   // check initial state of contract
  //   const initialState = await court.getData(klerosCourt.address)
  //   expect(initialState.session).toEqual(1)
  //   expect(initialState.period).toEqual(0)
  //
  //   const delaySecond = async () => {
  //     return new Promise((resolve, reject) => {
  //       setTimeout(() => {
  //         resolve(true)
  //       }, 1000)
  //     })
  //   }
  //
  //   let newState
  //   for (let i=1; i<6; i++) {
  //     // delay a second so period is eligible to be passed
  //     await delaySecond()
  //     newState = await court.passPeriod(klerosCourt.address)
  //     expect(newState.period).toEqual(i)
  //   }
  // }, 20000)

  test('rng deployed correctly', async () => {
    const number = 1
    const rngInstance = await rng.deploy(
      undefined,
      number
    )
    expect(rngInstance.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    const rngData = await rng.getData(rngInstance.address)
    expect(rngData.number).toEqual(number)
  })
})
