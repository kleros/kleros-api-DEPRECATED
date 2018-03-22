import Web3 from 'web3'

import Kleros from '../../src/kleros'
import * as ethConstants from '../../src/constants/eth'
import * as notificationConstants from '../../src/constants/notification'
import setUpContracts from '../helpers/setUpContracts'
import waitNotifications from '../helpers/waitNotifications'

describe('Notifications and Event Listeners', () => {
  let partyA
  let partyB
  let juror1
  let juror2
  let other
  let web3
  let KlerosInstance
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

    partyA = web3.eth.accounts[10]
    partyB = web3.eth.accounts[11]
    juror1 = web3.eth.accounts[12]
    juror2 = web3.eth.accounts[13]
    other = web3.eth.accounts[14]

    klerosPOCData = {
      timesPerPeriod: [1, 1, 1, 1, 1],
      account: other,
      value: 0
    }

    arbitrableContractData = {
      partyA,
      partyB,
      value: 1,
      hash: 'test',
      timeout: 1,
      extraData: '',
      title: 'test title',
      description: 'test description',
      email: 'test@test.test'
    }

    klerosPOCAddress = undefined
    arbitrableContractAddress = undefined
    rngAddress = undefined
    pnkAddress = undefined

    notificationCallback = notification => {
      notifications.push(notification)
    }
  })

  it(
    'KlerosPOC dispute resolution flow',
    async () => {
      ;[
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
      await KlerosInstance.klerosPOC.buyPNK(1, klerosPOCAddress, juror1)
      // buy PNK for juror2
      await KlerosInstance.klerosPOC.buyPNK(1, klerosPOCAddress, juror2)

      // activate PNK juror1
      const activatedTokenAmount = 0.5
      KlerosInstance.klerosPOC.activatePNK(
        activatedTokenAmount,
        klerosPOCAddress,
        juror1
      )
      // activate PNK juror2
      await KlerosInstance.klerosPOC.activatePNK(
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
      await KlerosInstance.arbitrableTransaction.payArbitrationFeeByPartyA(
        partyA,
        arbitrableContractAddress,
        arbitrationCost -
          KlerosInstance._web3Wrapper.fromWei(
            partyAFeeContractInstance,
            'ether'
          )
      )

      const partyBFeeContractInstance = await arbitrableContractInstance.partyBFee()

      await KlerosInstance.arbitrableTransaction.payArbitrationFeeByPartyB(
        partyB,
        arbitrableContractAddress,
        arbitrationCost -
          KlerosInstance._web3Wrapper.fromWei(
            partyBFeeContractInstance,
            'ether'
          )
      )

      const delaySecond = (seconds = 1) =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve(true)
          }, 1000 * seconds)
        })

      // wait for dispute raised notification
      let {
        promise: waitPromisePartyA,
        callback: waitCallbackPartyA
      } = waitNotifications(1, notificationCallback)
      await KlerosInstance.watchForEvents(
        klerosPOCAddress,
        partyA,
        waitCallbackPartyA
      )

      await waitPromisePartyA
      expect(notifications.length).toEqual(1)
      expect(notifications[0].notificationType).toEqual(
        notificationConstants.TYPE.DISPUTE_CREATED
      )

      KlerosInstance.eventListener.stopWatchingArbitratorEvents(
        klerosPOCAddress
      )
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
        await KlerosInstance.klerosPOC.passPeriod(klerosPOCAddress, other)
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

      expect(drawA.length > 0 || drawB.length > 0).toBeTruthy()

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
      await KlerosInstance.klerosPOC.submitVotes(
        klerosPOCAddress,
        0,
        rulingJuror1,
        drawA,
        juror1
      )
      const rulingJuror2 = 2
      await KlerosInstance.klerosPOC.submitVotes(
        klerosPOCAddress,
        0,
        rulingJuror2,
        drawB,
        juror2
      )

      await delaySecond()
      await KlerosInstance.klerosPOC.passPeriod(klerosPOCAddress, other)

      await delaySecond()
      await KlerosInstance.klerosPOC.passPeriod(klerosPOCAddress, other)
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

      // execute ruling
      await KlerosInstance.klerosPOC.executeRuling(klerosPOCAddress, 0, other)

      juror1StatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(
        klerosPOCAddress,
        juror1,
        true
      )
      expect(juror1StatefullNotifications.length).toEqual(0)

      let partyAStatefullNotifications = await KlerosInstance.notifications.getStatefulNotifications(
        klerosPOCAddress,
        partyA,
        false
      )
      expect(partyAStatefullNotifications.length).toEqual(0)

      expect(notifications.length).toBeTruthy()

      let notificationTypesExpected = [
        notificationConstants.TYPE.DISPUTE_CREATED
      ]
      let notificationTypes = notifications.map(
        notification => notification.notificationType
      )
      expect(notificationTypes.sort()).toEqual(notificationTypesExpected.sort())

      KlerosInstance.eventListener.stopWatchingArbitratorEvents(
        klerosPOCAddress
      )

      // spin up juror1 notifications listener. should populate missed notifications
      const numberOfNotifications = drawA.length + 2

      notifications = []
      let {
        promise: waitPromiseJuror,
        callback: waitCallbackJuror
      } = waitNotifications(numberOfNotifications, notificationCallback)
      await KlerosInstance.watchForEvents(
        klerosPOCAddress,
        juror1,
        waitCallbackJuror
      )

      await waitPromiseJuror

      expect(notifications.length).toBeTruthy()

      notificationTypesExpected = [
        notificationConstants.TYPE.ARBITRATION_REWARD,
        notificationConstants.TYPE.APPEAL_POSSIBLE
      ]

      drawA.forEach(() =>
        notificationTypesExpected.push(notificationConstants.TYPE.TOKEN_SHIFT)
      )

      notificationTypes = notifications.map(
        notification => notification.notificationType
      )
      expect(notificationTypes.sort()).toEqual(notificationTypesExpected.sort())

      KlerosInstance.eventListener.stopWatchingArbitratorEvents(
        klerosPOCAddress
      )
      // TODO find way to check timestamps and other non-callback notifications
    },
    250000
  )
})
