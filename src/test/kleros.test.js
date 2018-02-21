import Kleros from '../kleros'
import Web3 from 'web3'
import contract from 'truffle-contract'
import { LOCALHOST_ETH_PROVIDER, NOTIFICATION_TYPES } from '../../constants'
import config from '../../config'
import mockDisputes from '../contractWrappers/mockDisputes'


describe('Kleros', () => {
  let partyA
  let partyB
  let juror1
  let juror2
  let other
  let web3
  let KlerosInstance
  let storeProvider
  let notificationCallback
  let notifications = []

  beforeAll(async () => {
    // use testRPC
    const provider = await new Web3.providers.HttpProvider(LOCALHOST_ETH_PROVIDER)

    KlerosInstance = await new Kleros(provider)

    web3 = await new Web3(provider)

    partyA = web3.eth.accounts[0]
    partyB = web3.eth.accounts[1]
    juror1 = web3.eth.accounts[2]
    juror2 = web3.eth.accounts[3]
    other = web3.eth.accounts[4]

    storeProvider = await KlerosInstance.getStoreWrapper()

    notificationCallback = notification => {
      notifications.push(notification)
    }
  })

  beforeEach(async () => {
    // reset user profile in store
    await storeProvider.newUserProfile(partyA, {address: partyA})
    await storeProvider.newUserProfile(partyB, {address: partyB})
    await storeProvider.newUserProfile(juror1, {address: juror1})
    await storeProvider.newUserProfile(juror2, {address: juror2})
    await storeProvider.newUserProfile(other, {address: other})
  })

  test('deploy a arbitrableTransaction contract', async () => {
    // initialize Kleros
    const rngInstance = await KlerosInstance.blockHashRng.deploy(
      undefined
    )
    expect(rngInstance.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    const pinakionInstance = await KlerosInstance.pinakion.deploy()
    expect(pinakionInstance.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    // initialize KlerosPOC
    const klerosCourt = await KlerosInstance.klerosPOC.deploy(
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
    let contractArbitrableTransactionData = await KlerosInstance.arbitrableContract
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
    expect(contractArbitrableTransactionData.timeout)
      .toEqual(1)
    expect(contractArbitrableTransactionData.partyA)
      .toEqual(partyA)
    expect(contractArbitrableTransactionData.partyB)
      .toEqual(partyB)
    // TODO add test for lastInteraction, fix typeof of the var
  }, 10000)

  test(
    'KlerosPOC flow when partyA pays partyB',
    async () => {
    // initialize RNG and Pinakion contracts
    const rngInstance = await KlerosInstance.blockHashRng.deploy(
      undefined
    )
    expect(rngInstance.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    const pinakionInstance = await KlerosInstance.pinakion.deploy()
    expect(pinakionInstance.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    // initialize KlerosPOC
    const klerosCourt = await KlerosInstance.klerosPOC.deploy(
      rngInstance.address,
      pinakionInstance.address
    )
    expect(klerosCourt.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    // transfer ownership and set kleros instance
    const setKlerosHash = await KlerosInstance.pinakion.setKleros(
      pinakionInstance.address,
      klerosCourt.address
    )
    expect(setKlerosHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    const transferOwnershipHash = await KlerosInstance.pinakion.transferOwnership(
      pinakionInstance.address,
      klerosCourt.address
    )
    expect(transferOwnershipHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    const pnkData = await KlerosInstance.pinakion.getData(pinakionInstance.address)
    expect(pnkData.owner).toEqual(klerosCourt.address)
    expect(pnkData.kleros).toEqual(klerosCourt.address)

    // set instance of kleros court for assertions
    const klerosPOCInstance = await KlerosInstance.klerosPOC.load(klerosCourt.address)

    // deploy a contract and create dispute
    const mockHash = 'mock-hash-contract'
    const mockTimeout = 1
    const mockArbitratorExtraData = ''
    const mockEmail = 'test@kleros.io'
    const mockDescription = 'test description'
    const contractPaymentAmount = KlerosInstance._web3Wrapper.toWei(1, 'ether') // contract payment be 1 ether
    let contractArbitrableTransactionData = await KlerosInstance.arbitrableContract
      .deployContract(
        partyA,
        contractPaymentAmount, // use default value (0)
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

    // FIXME use arbitrableTransaction
    const arbitrableContractInstance = await KlerosInstance.arbitrableTransaction.load(contractArbitrableTransactionData.address)
    const partyApaysPartyB = await arbitrableContractInstance.pay({from: partyA})

    expect(partyApaysPartyB.tx)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  }, 50000)

  test(
    'KlerosPOC dispute resolution with a timeout call by partyA',
    async () => {
    // initialize RNG and Pinakion contracts
    const rngInstance = await KlerosInstance.blockHashRng.deploy(
      undefined
    )
    expect(rngInstance.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    const pinakionInstance = await KlerosInstance.pinakion.deploy()
    expect(pinakionInstance.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    // initialize KlerosPOC
    const klerosCourt = await KlerosInstance.klerosPOC.deploy(
      rngInstance.address,
      pinakionInstance.address
    )
    expect(klerosCourt.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    // deploy a contract and create dispute
    const mockHash = 'mock-hash-contract'
    const mockTimeout = 1
    const mockArbitratorExtraData = ''
    const mockEmail = 'test@kleros.io'
    const mockDescription = 'test description'
    const contractPaymentAmount = KlerosInstance._web3Wrapper.toWei(1, 'ether') // contract payment be 1 ether
    let contractArbitrableTransactionData = await KlerosInstance.arbitrableContract
      .deployContract(
        partyA,
        contractPaymentAmount, // use default value (0)
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

    // return a bigint
    // FIXME use arbitrableTransaction
    const arbitrableContractInstance = await KlerosInstance
      .arbitrableTransaction
      .load(contractArbitrableTransactionData.address)
    const partyAFeeContractInstance = await arbitrableContractInstance
      .partyAFee()

    // return bytes
    // FIXME use arbitrableTransaction
    let extraDataContractInstance = await arbitrableContractInstance
      .arbitratorExtraData()

    // return a bigint with the default value : 10000 wei fees in ether
    const arbitrationCost = await KlerosInstance.klerosPOC.getArbitrationCost(
      klerosCourt.address,
      extraDataContractInstance
    )

    // raise dispute party A
    const txHashRaiseDisputeByPartyA = await KlerosInstance.disputes
      .raiseDisputePartyA(
        partyA,
        contractArbitrableTransactionData.address,
        arbitrationCost - KlerosInstance._web3Wrapper.fromWei(partyAFeeContractInstance, 'ether')
      )
    expect(txHashRaiseDisputeByPartyA)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    const delaySecond = async () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(true)
        }, 1000)
      })
    }

    await delaySecond()

    // call timeout by partyA
    // TODO should test the api not directly the truffle contract
    const txHashTimeOutByPartyA = await arbitrableContractInstance
      .timeOutByPartyA({from: partyA})
    expect(txHashTimeOutByPartyA.tx)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  }, 50000)

  test('KlerosPOC dispute resolution flow', async () => {
    // initialize RNG and Pinakion contracts
    const rngInstance = await KlerosInstance.blockHashRng.deploy(
      undefined
    )
    expect(rngInstance.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    const pinakionInstance = await KlerosInstance.pinakion.deploy()
    expect(pinakionInstance.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    // initialize KlerosPOC
    const klerosCourt = await KlerosInstance.klerosPOC.deploy(
      rngInstance.address,
      pinakionInstance.address
    )
    expect(klerosCourt.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    // transfer ownership and set kleros instance
    const setKlerosHash = await KlerosInstance.pinakion.setKleros(
      pinakionInstance.address,
      klerosCourt.address
    )
    expect(setKlerosHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    const transferOwnershipHash = await KlerosInstance.pinakion.transferOwnership(
      pinakionInstance.address,
      klerosCourt.address
    )
    expect(transferOwnershipHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    const pnkData = await KlerosInstance.pinakion.getData(pinakionInstance.address)
    expect(pnkData.owner).toEqual(klerosCourt.address)
    expect(pnkData.kleros).toEqual(klerosCourt.address)

    // set instance of kleros court for assertions
    const klerosPOCInstance = await KlerosInstance.klerosPOC.load(klerosCourt.address)
    // initialize dispute watcher
    await KlerosInstance.watchForEvents(
      klerosCourt.address,
      partyA,
      notificationCallback
    )

    // juror1 should have no balance to start with
    const initialBalance = await KlerosInstance.arbitrator.getPNKBalance(klerosCourt.address, juror1)
    expect(initialBalance.tokenBalance).toEqual(0)

    // stateful notifications juror1
    let juror1StatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(klerosCourt.address, juror1, true)
    expect(juror1StatefullNotifications.length).toEqual(1)
    expect(juror1StatefullNotifications[0].notificationType).toEqual(NOTIFICATION_TYPES.CAN_ACTIVATE)

    // buy 1 PNK juror1
    const newBalance = await KlerosInstance.arbitrator.buyPNK(1, klerosCourt.address, juror1)
    expect(newBalance.tokenBalance).toEqual(1)
    // buy PNK for juror2
    await KlerosInstance.arbitrator.buyPNK(1, klerosCourt.address, juror2)

    // activate PNK juror1
    const activatedTokenAmount = 0.5
    const balance = await KlerosInstance.arbitrator.activatePNK(activatedTokenAmount, klerosCourt.address, juror1)
    expect(balance.tokenBalance).toEqual(1)
    expect(balance.activatedTokens).toEqual(0.5)
    // activate PNK juror2
    await KlerosInstance.arbitrator.activatePNK(activatedTokenAmount, klerosCourt.address, juror2)

    // stateful notifications juror1
    juror1StatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(klerosCourt.address, juror1, true)
    expect(juror1StatefullNotifications.length).toEqual(0)

    const juror1Data = await klerosPOCInstance.jurors(juror1)
    expect(juror1Data[2].toNumber()).toEqual((await klerosPOCInstance.session()).toNumber())
    expect((juror1Data[4].toNumber() - juror1Data[3].toNumber())).toEqual(parseInt(web3.toWei(activatedTokenAmount, 'ether')))

    // deploy a contract and create dispute
    const mockHash = 'mock-hash-contract'
    const mockTimeout = 1
    const mockArbitratorExtraData = ''
    const mockEmail = 'test@kleros.io'
    const mockDescription = 'test description'
    const contractPaymentAmount = KlerosInstance._web3Wrapper.toWei(1, 'ether') // contract payment be 1 ether
    let contractArbitrableTransactionData = await KlerosInstance.arbitrableContract
      .deployContract(
        partyA,
        contractPaymentAmount, // use default value (0)
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

    // return a bigint
    // FIXME use arbitrableTransaction
    const arbitrableContractInstance = await KlerosInstance
      .arbitrableTransaction
      .load(contractArbitrableTransactionData.address)
    const partyAFeeContractInstance = await arbitrableContractInstance
      .partyAFee()

    // return bytes
    // FIXME use arbitrableTransaction
    let extraDataContractInstance = await arbitrableContractInstance
      .arbitratorExtraData()

    // return a bigint with the default value : 10000 wei fees in ether
    const arbitrationCost = await KlerosInstance.klerosPOC.getArbitrationCost(
      klerosCourt.address,
      extraDataContractInstance
    )

    // raise dispute party A
    const txHashRaiseDisputeByPartyA = await KlerosInstance.disputes
      .raiseDisputePartyA(
        partyA,
        contractArbitrableTransactionData.address,
        arbitrationCost - KlerosInstance._web3Wrapper.fromWei(partyAFeeContractInstance, 'ether')
      )
    expect(txHashRaiseDisputeByPartyA)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    let partyBStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(klerosCourt.address, partyB, false)
    expect(partyBStatefullNotifications.length).toEqual(1)
    expect(partyBStatefullNotifications[0].notificationType).toEqual(NOTIFICATION_TYPES.CAN_PAY_FEE)
    expect(partyBStatefullNotifications[0].data.arbitrableContractAddress).toEqual(contractArbitrableTransactionData.address)
    expect(partyBStatefullNotifications[0].data.feeToPay).toEqual(arbitrationCost)
    // return a bigint
    // FIXME use arbitrableTransaction
    const partyBFeeContractInstance = await arbitrableContractInstance
      .partyBFee()

    const txHashRaiseDisputeByPartyB = await KlerosInstance.disputes
      .raiseDisputePartyB(
        partyB,
        contractArbitrableTransactionData.address,
        arbitrationCost - KlerosInstance._web3Wrapper.fromWei(partyBFeeContractInstance, 'ether')
      )
    expect(txHashRaiseDisputeByPartyB)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    partyBStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(klerosCourt.address, partyB, false)
    expect(partyBStatefullNotifications.length).toEqual(0)

    const dispute = await KlerosInstance.klerosPOC.getDispute(klerosCourt.address, 0)
    expect(dispute.arbitratedContract).toEqual(contractArbitrableTransactionData.address)
    expect(dispute.firstSession).toEqual((await klerosPOCInstance.session()).toNumber())
    expect(dispute.numberOfAppeals).toEqual(0)
    expect(dispute.voteCounters).toEqual(Array(dispute.numberOfAppeals + 1).fill(Array(dispute.rulingChoices + 1).fill(0)))

    // check fetch resolution options
    const resolutionOptions = await KlerosInstance.disputes.getRulingOptions(klerosCourt.address, 0)
    expect(resolutionOptions.length).toEqual(2)

    // add an evidence for partyA
    // FIXME use arbitrableTransaction
    const testName = 'test name'
    const testDesc = 'test description'
    const testURL = 'http://test.com'
    const txHashAddEvidence = await KlerosInstance.arbitrableContract
      .submitEvidence(
        partyA,
        contractArbitrableTransactionData.address,
        testName,
        testDesc,
        testURL
      )
    expect(txHashAddEvidence)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash

    let contracts = await KlerosInstance.arbitrator.getContractsForUser(partyA)
    expect(contracts).toBeTruthy()

    const contractStoreData = await KlerosInstance.arbitrableContract
      .getData(contractArbitrableTransactionData.address, partyA)

    expect(contractStoreData.evidences[0].url)
      .toBe(testURL)

    // check initial state of contract
    // FIXME var must be more explicit
    const initialState = await KlerosInstance.arbitrator.getData(klerosCourt.address)
    expect(initialState.session).toEqual(1)
    expect(initialState.period).toEqual(0)

    const delaySecond = async () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(true)
        }, 1000)
      })
    }

    let newState
    // pass state so juror1s are selected
    for (let i=1; i<3; i++) {
      // NOTE we need to make another block before we can generate the random number. Should not be an issue on main nets where avg block time < period length
      if (i == 2) web3.eth.sendTransaction({from: partyA, to: partyB, value: 10000, data: '0x'})
      await delaySecond()
      newState = await KlerosInstance.arbitrator.passPeriod(klerosCourt.address, other)
      expect(newState.period).toEqual(i)
    }
    let drawA = []
    let drawB = []
    for (let i = 1; i <= 3; i++) {
      if (await KlerosInstance.klerosPOC.isJurorDrawnForDispute(0, i, klerosCourt.address, juror1)) { drawA.push(i) } else { drawB.push(i) }
    }
    expect(drawA.length + drawB.length).toEqual(3)
    const disputesForJuror1 = await KlerosInstance.disputes.getDisputesForUser(klerosCourt.address, juror1)
    const disputesForJuror2 = await KlerosInstance.disputes.getDisputesForUser(klerosCourt.address, juror2)
    expect(disputesForJuror1.length > 0 || disputesForJuror2.length > 0).toBeTruthy()
    const disputeForJuror = disputesForJuror1.length > 0 ? disputesForJuror1[0] : disputesForJuror2[0]
    expect(disputeForJuror.deadline).toBe(1000 * (newState.lastPeriodChange + (await klerosPOCInstance.timePerPeriod(newState.period)).toNumber()))
    expect(disputeForJuror.arbitrableContractAddress).toEqual(contractArbitrableTransactionData.address)

    const jurorForNotifications = drawA.length > drawB.length ? juror1 : juror2
    // stateful notifications juror1
    let jurorStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(klerosCourt.address, jurorForNotifications, true)
    expect(jurorStatefullNotifications.length).toEqual(1)
    expect(jurorStatefullNotifications[0].notificationType).toEqual(NOTIFICATION_TYPES.CAN_VOTE)

    // submit rulings
    const rulingJuror1 = 1
    await KlerosInstance.disputes.submitVotesForDispute(
      klerosCourt.address,
      0,
      rulingJuror1,
      drawA,
      juror1
    )
    const rulingJuror2 = 2
    await KlerosInstance.disputes.submitVotesForDispute(
      klerosCourt.address,
      0,
      rulingJuror2,
      drawB,
      juror2
    )

    const winningRuling = drawA.length > drawB.length ? rulingJuror1 : rulingJuror2

    // delay 1 second
    await delaySecond()
    // move to appeal period
    await KlerosInstance.arbitrator.passPeriod(klerosCourt.address, other)

    const currentRuling = await klerosCourt.currentRuling(0)
    expect(`${currentRuling}`).toEqual(`${winningRuling}`)

    contracts = await KlerosInstance.arbitrator.getContractsForUser(partyA)
    expect(contracts).toBeTruthy()

    // TODO test appeal

    // delay 1 second
    await delaySecond()
    // move to execute period
    await KlerosInstance.arbitrator.passPeriod(klerosCourt.address, other)
    // stateful notifications
    jurorStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(klerosCourt.address, jurorForNotifications, true)
    expect(jurorStatefullNotifications.length).toEqual(1)
    expect(jurorStatefullNotifications[0].notificationType).toEqual(NOTIFICATION_TYPES.CAN_REPARTITION)

    partyBStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(klerosCourt.address, partyB, false)
    expect(partyBStatefullNotifications.length).toEqual(1)
    expect(partyBStatefullNotifications[0].notificationType).toEqual(NOTIFICATION_TYPES.CAN_REPARTITION)

    // balances before ruling is executed
    const partyABalance = web3.eth.getBalance(partyA).toNumber()
    const partyBBalance = web3.eth.getBalance(partyB).toNumber()
    // repartition tokens
    await KlerosInstance.klerosPOC.repartitionJurorTokens(klerosCourt.address, 0, other)

    // stateful notifications
    jurorStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(klerosCourt.address, jurorForNotifications, true)
    expect(jurorStatefullNotifications.length).toEqual(1)
    expect(jurorStatefullNotifications[0].notificationType).toEqual(NOTIFICATION_TYPES.CAN_EXECUTE)

    partyBStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(klerosCourt.address, partyB, false)
    expect(partyBStatefullNotifications.length).toEqual(1)
    expect(partyBStatefullNotifications[0].notificationType).toEqual(NOTIFICATION_TYPES.CAN_EXECUTE)

    // execute ruling
    await KlerosInstance.klerosPOC.executeRuling(klerosCourt.address, 0, other)
    // balances after ruling
    // partyA wins so they should recieve their arbitration fee as well as the value locked in contract
    if (winningRuling === rulingJuror1) {
      expect(web3.eth.getBalance(partyA).toNumber() - partyABalance).toEqual(KlerosInstance._web3Wrapper.toWei(arbitrationCost, 'ether') + contractPaymentAmount)
      // partyB lost so their balance should remain the same
      expect(web3.eth.getBalance(partyB).toNumber()).toEqual(partyBBalance)
    } else {
      expect(web3.eth.getBalance(partyB).toNumber() - partyBBalance).toEqual(KlerosInstance._web3Wrapper.toWei(arbitrationCost, 'ether') + contractPaymentAmount)
      // partyB lost so their balance should remain the same
      expect(web3.eth.getBalance(partyA).toNumber()).toEqual(partyABalance)
    }

    const updatedContractData = await KlerosInstance.arbitrableContract.getData(contractArbitrableTransactionData.address)
    expect(parseInt(updatedContractData.status)).toEqual(4)

    // NOTIFICATIONS
    // stateful notifications
    juror1StatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(klerosCourt.address, juror1, true)
    expect(juror1StatefullNotifications.length).toEqual(0)

    partyBStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(klerosCourt.address, partyB, false)
    expect(partyBStatefullNotifications.length).toEqual(0)

    expect(notifications.length).toBeTruthy()
    // partyA got notifications
    const allNotifications = await KlerosInstance.notifications.getNotifications(partyA)
    expect(allNotifications.length).toBe(notifications.length)
    let unreadNotification = await KlerosInstance.notifications.getUnreadNotifications(partyA)
    expect(unreadNotification).toEqual(allNotifications)
    await KlerosInstance.notifications.markNotificationAsRead(partyA, allNotifications[0].txHash, allNotifications[0].logIndex)
    unreadNotification = await KlerosInstance.notifications.getUnreadNotifications(partyA)
    expect(unreadNotification.length).toBe(notifications.length - 1)
    // stop listening for partyA
    KlerosInstance.eventListener.stopWatchingArbitratorEvents(klerosCourt.address)

    // spin up juror1 notifications listener. should populate missed notifications
    notifications = []
    await KlerosInstance.watchForEvents(
      klerosCourt.address,
      juror1,
      notificationCallback
    )

    const juror1Profile = await storeProvider.getUserProfile(juror1)
    expect(juror1Profile.disputes.length).toEqual(1)

    await delaySecond()
    const juror1Notifications = await KlerosInstance.notifications.getNotifications(juror1)
    expect(notifications.length).toBeTruthy()
    expect(juror1Notifications.length).toBe(notifications.length)
    let totalRedistributedJuror1 = 0
    for (let i=0; i<juror1Notifications.length; i++) {
      if (juror1Notifications[i].notificationType === NOTIFICATION_TYPES.TOKEN_SHIFT) {
        totalRedistributedJuror1 += juror1Notifications[i].data.amount
      }
    }
    expect(juror1Profile.disputes[0] ? juror1Profile.disputes[0].netPNK : 0).toEqual(totalRedistributedJuror1)

    KlerosInstance.eventListener.stopWatchingArbitratorEvents(klerosCourt.address)
  }, 80000)
})
