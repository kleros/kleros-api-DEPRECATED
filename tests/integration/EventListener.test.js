import Web3 from 'web3'

import KlerosPOC from '../../src/contracts/implementations/arbitrator/KlerosPOC'
import EventListener from '../../src/utils/EventListener'
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
      hash: 'test',
      timeout: 1,
      extraData: '',
      title: 'test title',
      description: 'test description',
      email: 'test@test.test'
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
      // load contract
      await KlerosPOCInstance.loadContract()

      const EventListenerInstance = new EventListener([
        KlerosPOCInstance.getContractInstance()
      ])
      // set up callback
      let { promise: waitPromise, callback: waitCallback } = waitNotifications(
        1,
        eventCallback
      )
      // add event handler
      const eventName = 'NewPeriod'
      EventListenerInstance.addEventHandler(
        KlerosPOCInstance.getContractAddress(),
        eventName,
        waitCallback
      )
      EventListenerInstance.watchForEvents()

      await delaySecond()
      KlerosPOCInstance.passPeriod()
      // we will wait for 2 seconds for promise to resolve or else throw
      let throwError = true
      setTimeout(() => {
        if (throwError) {
          EventListenerInstance.stopWatchingForEvents(
            KlerosPOCInstance.getContractAddress()
          )
          throw new Error('Callback Promise did not resolve')
        }
      }, 1000 * 2)

      await waitPromise
      throwError = false

      expect(eventLogs.length).toEqual(1)
      const log = eventLogs[0]
      expect(log.event).toEqual(eventName)

      EventListenerInstance.stopWatchingForEvents(
        KlerosPOCInstance.getContractAddress()
      )
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
    // load contract
    await KlerosPOCInstance.loadContract()

    // add conract instance with event handler
    const EventListenerInstance = new EventListener([
      KlerosPOCInstance.getContractInstance()
    ])
    EventListenerInstance.addEventHandler(
      KlerosPOCInstance.getContractAddress(),
      'FakeEvent',
      () => {}
    )

    EventListenerInstance.watchForEvents()

    EventListenerInstance.removeContractInstance(
      KlerosPOCInstance.getContractAddress()
    )

    expect(EventListenerInstance.contractInstances.length).toEqual(0)
    expect(
      EventListenerInstance.contractEventHandlerMap[
        KlerosPOCInstance.getContractAddress()
      ]
    ).toBeUndefined()
  })
})
