import Web3 from 'web3'

import KlerosPOC from '../../src/contracts/implementations/arbitrator/KlerosPOC'
import EventListener from '../../src/utils/EventListener'
import Kleros from '../../src/kleros'
import * as ethConstants from '../../src/constants/eth'
import setUpContracts from '../helpers/setUpContracts'
import waitNotifications from '../helpers/waitNotifications'
import delaySecond from '../helpers/delaySecond'

describe('Event Listener', () => {
  let partyA
  let partyB
  let other
  let web3
  let eventCallback
  let eventLogs = []
  let klerosPOCData
  let arbitrableContractData
  let provider

  beforeAll(async () => {
    // use testRPC
    provider = await new Web3.providers.HttpProvider(
      ethConstants.LOCALHOST_ETH_PROVIDER
    )

    web3 = await new Web3(provider)

    partyA = web3.eth.accounts[1]
    partyB = web3.eth.accounts[2]
    other = web3.eth.accounts[5]

    klerosPOCData = {
      timesPerPeriod: [1, 1, 1, 1, 1],
      account: other,
      value: 0
    }

    arbitrableContractData = {
      partyA,
      partyB,
      value: 1,
      timeout: 1,
      extraData: '',
      title: 'test title',
      description: 'test description',
      email: 'test@test.test',
      metaEvidenceUri: 'https://test-meta-evidence.com'
    }

    eventCallback = log => {
      eventLogs.push(log)
    }
  })

  it(
    'registers handler for event and successfully fires callback on log',
    async () => {
      const [
        klerosPOCAddress,
        arbitrableContractAddress,
        rngAddress,
        pnkAddress
      ] = await setUpContracts(provider, klerosPOCData, arbitrableContractData)

      expect(klerosPOCAddress).toBeDefined()
      expect(arbitrableContractAddress).toBeDefined()
      expect(rngAddress).toBeDefined()
      expect(pnkAddress).toBeDefined()

      const KlerosPOCInstance = new KlerosPOC(provider, klerosPOCAddress)

      const EventListenerInstance = new EventListener([KlerosPOCInstance])
      // set up callback
      let { promise: waitPromise, callback: waitCallback } = waitNotifications(
        1,
        eventCallback
      )
      // add event handler
      const eventName = 'NewPeriod'
      EventListenerInstance.addEventHandler(
        KlerosPOCInstance,
        eventName,
        waitCallback
      )
      await EventListenerInstance.watchForEvents()

      await delaySecond()
      KlerosPOCInstance.passPeriod(other)
      // we will wait for 2 seconds for promise to resolve or else throw
      let throwError = true
      setTimeout(() => {
        if (throwError) {
          EventListenerInstance.stopWatchingForEvents(KlerosPOCInstance)
          throw new Error('Callback Promise did not resolve')
        }
      }, 1000 * 2)

      await waitPromise
      throwError = false

      expect(eventLogs.length).toEqual(1)
      const log = eventLogs[0]
      expect(log.event).toEqual(eventName)

      EventListenerInstance.stopWatchingForEvents(KlerosPOCInstance)
    },
    50000
  )
  it('can stop and remove contract instance', async () => {
    const [
      klerosPOCAddress,
      arbitrableContractAddress,
      rngAddress,
      pnkAddress
    ] = await setUpContracts(provider, klerosPOCData, arbitrableContractData)

    expect(klerosPOCAddress).toBeDefined()
    expect(arbitrableContractAddress).toBeDefined()
    expect(rngAddress).toBeDefined()
    expect(pnkAddress).toBeDefined()

    const KlerosPOCInstance = new KlerosPOC(provider, klerosPOCAddress)

    // add conract instance with event handler
    const EventListenerInstance = new EventListener([KlerosPOCInstance])
    EventListenerInstance.addEventHandler(
      KlerosPOCInstance,
      'FakeEvent',
      () => {}
    )
    await EventListenerInstance.watchForEvents()

    EventListenerInstance.removeContractInstance(KlerosPOCInstance)

    expect(EventListenerInstance.contractInstances.length).toEqual(0)
    expect(
      EventListenerInstance.contractEventHandlerMap[KlerosPOCInstance]
    ).toBeUndefined()
  })
  it(
    'registers handler for event, stops and starts again using only second handler from kleros',
    async () => {
      const [
        klerosPOCAddress,
        arbitrableContractAddress,
        rngAddress,
        pnkAddress
      ] = await setUpContracts(provider, klerosPOCData, arbitrableContractData)

      expect(klerosPOCAddress).toBeDefined()
      expect(arbitrableContractAddress).toBeDefined()
      expect(rngAddress).toBeDefined()
      expect(pnkAddress).toBeDefined()

      const KlerosInstance = new Kleros(provider, '', klerosPOCAddress)

      // start event watching
      await KlerosInstance.watchForEvents(partyA)
      // stop watching for events to clear store provider events and to reset contractInstances
      await KlerosInstance.stopWatchingForEvents()
      expect(KlerosInstance.eventListener.contractInstances.length).toEqual(0)
      expect(
        KlerosInstance.eventListener.contractEventHandlerMap[
          KlerosInstance.arbitrator
        ]
      ).toBeUndefined()
      expect(
        KlerosInstance.eventListener.watcherInstances[KlerosInstance.arbitrator]
      ).toBeUndefined()
      // add the contract back
      await KlerosInstance.eventListener.addContractImplementation(
        KlerosInstance.arbitrator
      )
      // set up callback
      let { promise: waitPromise, callback: waitCallback } = waitNotifications(
        1,
        eventCallback
      )
      // add event handler
      const eventName = 'NewPeriod'
      KlerosInstance.eventListener.addEventHandler(
        KlerosInstance.arbitrator,
        eventName,
        waitCallback
      )
      // start watching for events again
      await KlerosInstance.eventListener.watchForEvents()

      await delaySecond()
      await KlerosInstance.arbitrator.passPeriod(other)
      // we will wait for 2 seconds for promise to resolve or else throw
      let throwError = true
      setTimeout(() => {
        if (throwError) {
          KlerosInstance.eventListener.stopWatchingForEvents(
            KlerosInstance.arbitrator
          )
          throw new Error('Callback Promise did not resolve')
        }
      }, 1000 * 2)

      await waitPromise
      throwError = false

      expect(
        eventLogs.filter(
          event =>
            event.address === KlerosInstance.arbitrator.getContractAddress()
        ).length
      ).toEqual(1)

      KlerosInstance.eventListener.stopWatchingForEvents(
        KlerosInstance.arbitrator
      )
    },
    50000
  )
})
