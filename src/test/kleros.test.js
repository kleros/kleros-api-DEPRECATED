import Kleros from '../kleros'
import Web3 from 'web3'
import contract from 'truffle-contract'
import {LOCALHOST_PROVIDER} from '../../constants'
import config from '../../config'
import mockDisputes from '../../contract_wrapper/mockDisputes'


describe('Kleros', () => {
  let partyA
  let partyB
  let juror
  let other
  let web3
  let klerosPOC
  let centralCourt
  let arbitrableTransaction
  let disputesApi
  let arbitratorApi
  let arbitrableContractApi
  let blockHashRng
  let pinakion

  beforeAll(async () => {
    // use testRPC
    const provider = await new Web3.providers.HttpProvider(LOCALHOST_PROVIDER)

    let KlerosInstance = await new Kleros(provider)

    web3 = await new Web3(provider)

    partyA = web3.eth.accounts[0]
    partyB = web3.eth.accounts[1]
    juror = web3.eth.accounts[3]
    other = web3.eth.accounts[4]

    klerosPOC = await KlerosInstance.klerosPOC
    blockHashRng = await KlerosInstance.blockHashRng
    pinakion = await KlerosInstance.pinakion
    arbitrableTransaction = await KlerosInstance.arbitrableTransaction
    disputesApi = await KlerosInstance.disputes
    arbitratorApi = await KlerosInstance.arbitrator
    arbitrableContractApi = await KlerosInstance.arbitrableContract
  })

  beforeEach(async () => {
    // reset user profile in store
    await disputesApi._StoreProvider.newUserProfile(partyA, {address: partyA})
    await disputesApi._StoreProvider.newUserProfile(partyB, {address: partyB})
  })

  test('deploy a arbitrableTransaction contract', async () => {
    // initialize Kleros
    const rngInstance = await blockHashRng.deploy(
      undefined
    )
    expect(rngInstance.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    const pinakionInstance = await pinakion.deploy()
    expect(pinakionInstance.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    // initialize KlerosPOC
    const klerosCourt = await klerosPOC.deploy(
      rngInstance.address,
      pinakionInstance.address
    )
    expect(klerosCourt.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash


    const mockHash = 'mock-hash-contract'
    const mockTimeout = 1
    const mockArbitratorExtraData = ''
    const mockEmail = 'test@kleros.io'
    const mockDescription = 'test description'
    let contractArbitrableTransactionData = await arbitrableContractApi
      .deployContract(
        partyA,
        undefined, // use default value (0)
        mockHash,
        klerosCourt.address,
        mockTimeout,
        partyB,
        mockArbitratorExtraData,
        mockEmail,
        mockDescription
      )

    expect(contractArbitrableTransactionData.address)
      .toBeDefined() // contract address
    expect(contractArbitrableTransactionData.arbitrator)
      .toEqual(klerosCourt.address)
    expect(contractArbitrableTransactionData.partyA)
      .toEqual(partyA)
    expect(contractArbitrableTransactionData.partyB)
      .toEqual(partyB)
  }, 10000)

  // test('KlerosPOC dispute resolution flow', async () => {
  //   // initialize RNG and Pinakion contracts
  //   const rngInstance = await rng.deploy(
  //     undefined
  //   )
  //   expect(rngInstance.transactionHash)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //
  //   const pinakionInstance = await pinakion.deploy()
  //   expect(pinakionInstance.transactionHash)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //
  //   // initialize KlerosPOC
  //   const klerosCourt = await court.deploy(
  //     rngInstance.address,
  //     pinakionInstance.address
  //   )
  //
  //   expect(klerosCourt.transactionHash)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //
  //   // transfer ownership and set kleros instance
  //   let data = await pinakion.setKleros(
  //     pinakionInstance.address,
  //     klerosCourt.address
  //   )
  //
  //   expect(data.kleros).toEqual(klerosCourt.address)
  //
  //   data = await pinakion.transferOwnership(
  //     pinakionInstance.address,
  //     klerosCourt.address
  //   )
  //
  //   expect(data.owner).toEqual(klerosCourt.address)
  //
  //   // Juror should have no balance to start with
  //   const initialBalance = await court.getPNKBalance(klerosCourt.address, juror)
  //   expect(initialBalance.tokenBalance).toEqual('0')
  //
  //   // buy 1 PNK
  //   const newBalance = await court.buyPNK(1, klerosCourt.address, juror)
  //   expect(newBalance.tokenBalance).toEqual('1')
  //
  //   // activate PNK
  //   const balance = await court.activatePNK(0.5, klerosCourt.address, juror)
  //   expect(balance.tokenBalance).toEqual('1')
  //   expect(balance.activatedTokens).toEqual('0.5')
  //   // create a new dispute
  //   let contractData = {
  //     arbitrator: klerosCourt.address,
  //     timeout: 3600,
  //     partyA,
  //     partyB,
  //     arbitratorExtraData: 0x00,
  //     status: 0,
  //   }
  //
  //   const contractPaymentAmount = web3.toWei(1, 'ether') // contract payment be 1 ether
  //   let contractArbitrableTransaction = await arbitrableTransaction.deploy(
  //     undefined, // use default account : account[0]
  //     contractPaymentAmount,
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
  //   // FIXME use arbitrableTransaction
  //   const partyAFeeContractInstance = await contractArbitrableTransaction
  //     .partyAFee()
  //
  //   // return bytes
  //   // FIXME use arbitrableTransaction
  //   let extraDataContractInstance = await contractArbitrableTransaction
  //     .arbitratorExtraData()
  //
  //   // return a bigint with the default value : 10000 wei fees
  //   const arbitrationCost = await klerosCourt
  //     .arbitrationCost(extraDataContractInstance)
  //
  //   // use default parameters
  //   // account: accounts[0]
  //   // arbitration cost: 10000 wei
  //   const txHashRaiseDisputeByPartyA = await arbitrableTransaction
  //     .payArbitrationFeeByPartyA(
  //       undefined,
  //       contractArbitrableTransaction.address,
  //       web3.fromWei(
  //         arbitrationCost - partyAFeeContractInstance.toNumber(), 'ether'
  //       )
  //     )
  //
  //   expect(txHashRaiseDisputeByPartyA)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //
  //   // return a bigint
  //   // FIXME use arbitrableTransaction
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
  //       web3.fromWei(
  //         arbitrationCost - partyBFeeContractInstance.toNumber(), 'ether'
  //       )
  //     )
  //
  //   expect(txHashRaiseDisputeByPartyB)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //   // check to see if store is updated
  //   const userProfile = await arbitrableTransaction._StoreProvider.getUserProfile(partyA)
  //   expect(userProfile.disputes.length).toEqual(1)
  //
  //   const dispute = await klerosCourt.disputes(0)
  //
  //   // dispute created
  //   expect(dispute[0]).toEqual(expect.stringMatching(/^0x[a-f0-9]{40}$/)) // tx hash
  //
  //   // add an evidence
  //   // FIXME use arbitrableTransaction
  //   const testName = 'test name'
  //   const testDesc = 'test description'
  //   const testURL = 'http://test.com'
  //   const txHashAddEvidence = await arbitrableTransaction
  //     .submitEvidence(
  //       undefined,
  //       contractArbitrableTransaction.address,
  //       testName,
  //       testDesc,
  //       testURL
  //     )
  //
  //   expect(txHashAddEvidence)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //
  //   const contractDataDeployed = await arbitrableTransaction
  //     .getDataContract(contractArbitrableTransaction.address)
  //
  //   expect(contractDataDeployed.evidences[0].url)
  //     .toBe(testURL)
  //
  //   // check initial state of contract
  //   // FIXME var must be more explicit
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
  //   // pass state so jurors are selected
  //   for (let i=1; i<3; i++) {
  //     // NOTE we need to make another block before we can generate the random number. Should not be an issue on main nets where avg block time < period length
  //     if (i == 2) web3.eth.sendTransaction({from: partyA, to: partyB, value: 10000, data: '0x'})
  //     // delay a second so period is eligible to be passed
  //     await delaySecond()
  //     newState = await court.passPeriod(klerosCourt.address, other)
  //     expect(newState.period).toEqual(i)
  //   }
  //
  //   const isJuror = await klerosCourt.isDrawn(0, juror, 1)
  //   expect(isJuror).toEqual(true)
  //
  //   // partyA wins
  //   const ruling = 1
  //   const submitTxHash = await court.submitVotes(
  //     klerosCourt.address,
  //     0,
  //     ruling,
  //     [1],
  //     contractArbitrableTransaction.address, // FIXME using address for hash right now
  //     juror
  //   )
  //
  //   expect(submitTxHash)
  //     .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  //
  //   // delay 1 second
  //   await delaySecond()
  //   // move to appeal period
  //   await court.passPeriod(klerosCourt.address, other)
  //
  //   const currentRuling = await klerosCourt.currentRuling(0)
  //   expect(`${currentRuling}`).toEqual(`${ruling}`)
  //
  //   const contracts = await court.getContractsForUser()
  //   expect(contracts).toBeTruthy()
  //
  //   // TODO test appeal
  //
  //   // delay 1 second
  //   await delaySecond()
  //   // move to execute period
  //   await court.passPeriod(klerosCourt.address, other)
  //   // balances before ruling is executed
  //   const partyABalance = web3.eth.getBalance(partyA).toNumber()
  //   const partyBBalance = web3.eth.getBalance(partyB).toNumber()
  //   // repartition tokens
  //   await court.repartitionJurorTokens(klerosCourt.address, 0, other)
  //   // execute ruling
  //   await court.executeRuling(klerosCourt.address, 0, other)
  //   // balances after ruling
  //   // partyA wins so they should recieve their arbitration fee as well as the value locked in contract
  //   expect(web3.eth.getBalance(partyA).toNumber() - partyABalance).toEqual(arbitrationCost.toNumber() + parseInt(contractPaymentAmount))
  //   // partyB lost so their balance should remain the same
  //   expect(web3.eth.getBalance(partyB).toNumber()).toEqual(partyBBalance)
  //
  //   const contractStatus = await contractArbitrableTransaction.status.call()
  //   expect(parseInt(contractStatus)).toEqual(4)
  // }, 50000)
})
