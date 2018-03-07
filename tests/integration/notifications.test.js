import Web3 from 'web3'

import Kleros from '../../src/kleros'
import * as ethConstants from '../../src/constants/eth'
import * as notificationConstants from '../../src/constants/notification'

import {
  setUpContracts,
  waitNotifications
} from './helpers'

describe('Notifications and Event Listeners', () => {
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
  let klerosPOCData
  let arbitrableContractData
  let klerosPOCAddress
  let arbitrableContractAddress
  let rngAddress
  let pnkAddress

  beforeAll(async () => {
    // use testRPC
    const provider = await new Web3.providers.HttpProvider(
      ethConstants.LOCALHOST_ETH_PROVIDER
    )

    KlerosInstance = await new Kleros(provider)

    web3 = await new Web3(provider)

    partyA = web3.eth.accounts[0]
    partyB = web3.eth.accounts[1]
    juror1 = web3.eth.accounts[2]
    juror2 = web3.eth.accounts[3]
    other = web3.eth.accounts[4]

    storeProvider = await KlerosInstance.getStoreWrapper()

    klerosPOCData = {
      timesPerPeriod: [1,1,1,1,1],
      account: other,
      value: 0
    }

    arbitrableContractData = {
      partyA,
      partyB,
      value: 1,
      hash: "test",
      timeout: 1,
      extraData: '',
      title: "test title",
      description: "test description",
      email: "test@test.test",
    }

    klerosPOCAddress = undefined
    arbitrableContractAddress = undefined
    rngAddress = undefined
    pnkAddress = undefined

    notificationCallback = notification => {
      notifications.push(notification)
    }
  })

  beforeEach(async () => {
    // reset user profile in store
    await storeProvider.newUserProfile(partyA, { address: partyA })
    await storeProvider.newUserProfile(partyB, { address: partyB })
    await storeProvider.newUserProfile(juror1, { address: juror1 })
    await storeProvider.newUserProfile(juror2, { address: juror2 })
    await storeProvider.newUserProfile(other, { address: other })
  })

  it(
    'KlerosPOC dispute resolution flow',
    async () => {
      [
        klerosPOCAddress,
        arbitrableContractAddress,
        rngAddress,
        pnkAddress
      ] = await setUpContracts(
        KlerosInstance,
        klerosPOCData,
        arbitrableContractData
      )

      expect(klerosPOCAddress).toBeDefined()
      expect(arbitrableContractAddress).toBeDefined()
      expect(rngAddress).toBeDefined()
      expect(pnkAddress).toBeDefined()

      // initialize dispute watcher
      await KlerosInstance.watchForEvents(
        klerosPOCAddress,
        partyA,
        notificationCallback
      )

      // stateful notifications juror1
      let juror1StatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(
        klerosPOCAddress,
        juror1,
        true
      )
      expect(juror1StatefullNotifications.length).toEqual(1)
      expect(juror1StatefullNotifications[0].notificationType).toEqual(
        notificationConstants.TYPE.CAN_ACTIVATE
      )

      // buy 1 PNK juror1
      await KlerosInstance.arbitrator.buyPNK(
        1,
        klerosPOCAddress,
        juror1
      )
      // buy PNK for juror2
      await KlerosInstance.arbitrator.buyPNK(1, klerosPOCAddress, juror2)

      // activate PNK juror1
      const activatedTokenAmount = 0.5
      KlerosInstance.arbitrator.activatePNK(
        activatedTokenAmount,
        klerosPOCAddress,
        juror1
      )
      // activate PNK juror2
      await KlerosInstance.arbitrator.activatePNK(
        activatedTokenAmount,
        klerosPOCAddress,
        juror2
      )

      // stateful notifications juror1
      juror1StatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(
        klerosPOCAddress,
        juror1,
        true
      )
      expect(juror1StatefullNotifications.length).toEqual(0)

      // load klerosPOC
      const klerosPOCInstance = await KlerosInstance.klerosPOC.load(klerosPOCAddress)

      // return a bigint
      // FIXME use arbitrableTransaction
      const arbitrableContractInstance = await KlerosInstance.arbitrableTransaction.load(
        arbitrableContractAddress
      )
      const partyAFeeContractInstance = await arbitrableContractInstance.partyAFee()

      // return bytes
      // FIXME use arbitrableTransaction
      let extraDataContractInstance = await arbitrableContractInstance.arbitratorExtraData()

      // return a bigint with the default value : 10000 wei fees in ether
      const arbitrationCost = await KlerosInstance.klerosPOC.getArbitrationCost(
        klerosPOCAddress,
        extraDataContractInstance
      )

      // raise dispute party A
      await KlerosInstance.disputes.raiseDisputePartyA(
        partyA,
        arbitrableContractAddress,
        arbitrationCost -
          KlerosInstance._web3Wrapper.fromWei(
            partyAFeeContractInstance,
            'ether'
          )
      )

      let partyBStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(
        klerosPOCAddress,
        partyB,
        false
      )
      expect(partyBStatefullNotifications.length).toEqual(1)
      expect(partyBStatefullNotifications[0].notificationType).toEqual(
        notificationConstants.TYPE.CAN_PAY_FEE
      )
      expect(
        partyBStatefullNotifications[0].data.arbitrableContractAddress
      ).toEqual(arbitrableContractAddress)
      expect(partyBStatefullNotifications[0].data.feeToPay).toEqual(
        arbitrationCost
      )
      // return a bigint
      // FIXME use arbitrableTransaction
      const partyBFeeContractInstance = await arbitrableContractInstance.partyBFee()

      await KlerosInstance.disputes.raiseDisputePartyB(
        partyB,
        arbitrableContractAddress,
        arbitrationCost -
          KlerosInstance._web3Wrapper.fromWei(
            partyBFeeContractInstance,
            'ether'
          )
      )

      partyBStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(
        klerosPOCAddress,
        partyB,
        false
      )
      expect(partyBStatefullNotifications.length).toEqual(0)

      const delaySecond = (seconds = 1) =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve(true)
          }, 1000 * seconds)
        })

      let newState
      // pass state so jurors are selected
      for (let i = 1; i < 3; i++) {
        // NOTE we need to make another block before we can generate the random number. Should not be an issue on main nets where avg block time < period length
        if (i === 2)
          web3.eth.sendTransaction({
            from: partyA,
            to: partyB,
            value: 10000,
            data: '0x'
          })
        await delaySecond()
        newState = await KlerosInstance.arbitrator.passPeriod(
          klerosPOCAddress,
          other
        )
      }

      let drawA = []
      let drawB = []
      for (let i = 1; i <= 3; i++) {
        if (
          await KlerosInstance.klerosPOC.isJurorDrawnForDispute(
            0,
            i,
            klerosPOCAddress,
            juror1
          )
        ) {
          drawA.push(i)
        } else {
          drawB.push(i)
        }
      }

      const disputesForJuror1 = await KlerosInstance.disputes.getDisputesForUser(
        klerosPOCAddress,
        juror1
      )
      const disputesForJuror2 = await KlerosInstance.disputes.getDisputesForUser(
        klerosPOCAddress,
        juror2
      )
      const disputeForJuror =
        disputesForJuror1.length > 0
          ? disputesForJuror1[0]
          : disputesForJuror2[0]
      expect(disputeForJuror.appealRulings[0].deadline).toBe(
        1000 *
          (newState.lastPeriodChange +
            (await klerosPOCInstance.timePerPeriod(newState.period)).toNumber())
      )

      const jurorForNotifications =
        drawA.length > drawB.length ? juror1 : juror2
      // stateful notifications juror1
      let jurorStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(
        klerosPOCAddress,
        jurorForNotifications,
        true
      )
      expect(jurorStatefullNotifications.length).toEqual(1)
      expect(jurorStatefullNotifications[0].notificationType).toEqual(
        notificationConstants.TYPE.CAN_VOTE
      )

      // submit rulings
      const rulingJuror1 = 1
      await KlerosInstance.disputes.submitVotesForDispute(
        klerosPOCAddress,
        0,
        rulingJuror1,
        drawA,
        juror1
      )
      const rulingJuror2 = 2
      await KlerosInstance.disputes.submitVotesForDispute(
        klerosPOCAddress,
        0,
        rulingJuror2,
        drawB,
        juror2
      )

      const winningRuling =
        drawA.length > drawB.length ? rulingJuror1 : rulingJuror2

      await delaySecond()
      await KlerosInstance.arbitrator.passPeriod(klerosPOCAddress, other)

      await delaySecond()
      await KlerosInstance.arbitrator.passPeriod(klerosPOCAddress, other)
      // stateful notifications
      jurorStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(
        klerosPOCAddress,
        jurorForNotifications,
        true
      )
      expect(jurorStatefullNotifications.length).toEqual(1)
      expect(jurorStatefullNotifications[0].notificationType).toEqual(
        notificationConstants.TYPE.CAN_REPARTITION
      )

      let partyAStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(
        klerosPOCAddress,
        partyA,
        false
      )
      expect(partyAStatefullNotifications.length).toEqual(1)
      expect(partyAStatefullNotifications[0].notificationType).toEqual(
        notificationConstants.TYPE.CAN_REPARTITION
      )

      // repartition tokens
      await KlerosInstance.klerosPOC.repartitionJurorTokens(
        klerosPOCAddress,
        0,
        other
      )

      // stateful notifications
      jurorStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(
        klerosPOCAddress,
        jurorForNotifications,
        true
      )
      expect(jurorStatefullNotifications.length).toEqual(1)
      expect(jurorStatefullNotifications[0].notificationType).toEqual(
        notificationConstants.TYPE.CAN_EXECUTE
      )

      partyAStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(
        klerosPOCAddress,
        partyA,
        false
      )
      expect(partyAStatefullNotifications.length).toEqual(1)
      expect(partyAStatefullNotifications[0].notificationType).toEqual(
        notificationConstants.TYPE.CAN_EXECUTE
      )

      // execute ruling
      await KlerosInstance.klerosPOC.executeRuling(
        klerosPOCAddress,
        0,
        other
      )
      // balances after ruling
      // partyA wins so they should recieve their arbitration fee as well as the value locked in contract

      // NOTIFICATIONS
      // stateful notifications
      juror1StatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(
        klerosPOCAddress,
        juror1,
        true
      )
      expect(juror1StatefullNotifications.length).toEqual(0)

      partyAStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(
        klerosPOCAddress,
        partyA,
        false
      )
      expect(partyAStatefullNotifications.length).toEqual(0)

      expect(notifications.length).toBeTruthy()
      // partyA got notifications
      const allNotifications = await KlerosInstance.notifications.getNotifications(
        partyA
      )
      expect(allNotifications.length).toBe(notifications.length) // TODO Broken

      let notificationTypesExpected = [
        notificationConstants.TYPE.DISPUTE_CREATED,
        notificationConstants.TYPE.APPEAL_POSSIBLE
      ]
      let notificationTypes = allNotifications.map(
        notification => notification.notificationType
      )
      expect(notificationTypes.sort()).toEqual(notificationTypesExpected.sort())

      let unreadNotification = await KlerosInstance.notifications.getUnreadNotifications(
        partyA
      )
      expect(unreadNotification).toEqual(allNotifications)
      await KlerosInstance.notifications.markNotificationAsRead(
        partyA,
        allNotifications[0].txHash,
        allNotifications[0].logIndex
      )
      unreadNotification = await KlerosInstance.notifications.getUnreadNotifications(
        partyA
      )
      expect(unreadNotification.length).toBe(notifications.length - 1)
      // stop listening for partyA
      KlerosInstance.eventListener.stopWatchingArbitratorEvents(
        klerosPOCAddress
      )

      // spin up juror1 notifications listener. should populate missed notifications
      notifications = []
      let { promise: waitPromise, callback: waitCallback } = waitNotifications(
        2,
        notificationCallback
      )
      await KlerosInstance.watchForEvents(
        klerosPOCAddress,
        juror1,
        waitCallback
      )

      await waitPromise

      const juror1Profile = await storeProvider.getUserProfile(juror1)
      expect(juror1Profile.disputes.length).toEqual(1)
      const juror1Notifications = await KlerosInstance.notifications.getNotifications(
        juror1
      )
      // expect(notifications.length).toBeTruthy()
      expect(juror1Notifications.length).toBe(notifications.length)
      let totalRedistributedJuror1 = 0
      for (let i = 0; i < juror1Notifications.length; i++) {
        if (
          juror1Notifications[i].notificationType ===
          notificationConstants.TYPE.TOKEN_SHIFT
        ) {
          totalRedistributedJuror1 += juror1Notifications[i].data.amount
        }
      }
      expect(
        juror1Profile.disputes[0] ? juror1Profile.disputes[0].netPNK : 0
      ).toEqual(totalRedistributedJuror1)

      KlerosInstance.eventListener.stopWatchingArbitratorEvents(
        klerosPOCAddress
      )

      // make sure createdAt set
      const disputeData = await KlerosInstance.disputes.getDataForDispute(
        klerosPOCAddress,
        0,
        juror1
      )
      expect(disputeData.appealCreatedAt.length).toEqual(1)
      expect(disputeData.appealRuledAt.length).toEqual(1)
    },
    80000
  )
})
