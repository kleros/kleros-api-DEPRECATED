import Web3 from 'web3'

import Kleros from '../../src/kleros'
import * as ethConstants from '../../src/constants/eth'

import { setUpContracts, resetUserProfile } from './helpers'

describe('Contracts', () => {
  let partyA
  let partyB
  let juror1
  let juror2
  let other
  let web3
  let KlerosInstance
  let storeProvider
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
      timesPerPeriod: [1, 1, 1, 1, 1],
      account: other,
      value: 0
    }

    arbitrableContractData = {
      partyA,
      partyB,
      value: 0,
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
  })

  beforeEach(async () => {
    // reset user profile in store
    await resetUserProfile(storeProvider, partyA)
    await resetUserProfile(storeProvider, partyB)
    await resetUserProfile(storeProvider, juror1)
    await resetUserProfile(storeProvider, juror2)
    await resetUserProfile(storeProvider, other)
  })

  describe('ArbitrableContract', async () => {
    it(
      'deploy a arbitrableTransaction contract',
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
        // PNK
        const pinakionInstanceData = await KlerosInstance.pinakion.getData(
          pnkAddress
        )
        expect(pinakionInstanceData.kleros).toEqual(klerosPOCAddress)
        expect(pinakionInstanceData.owner).toEqual(klerosPOCAddress)
        // KlerosPOC
        const klerosCourtData = await KlerosInstance.klerosPOC.getData(
          klerosPOCAddress
        )
        expect(klerosCourtData.pinakionContractAddress).toEqual(pnkAddress)
        expect(klerosCourtData.rngContractAddress).toEqual(rngAddress)
        expect(klerosCourtData.period).toEqual(0)
        expect(klerosCourtData.session).toEqual(1)
        // arbitrable contract
        const contractArbitrableTransactionData = await KlerosInstance.arbitrableContract.getData(
          arbitrableContractAddress,
          partyA
        )
        expect(contractArbitrableTransactionData.address).toEqual(
          arbitrableContractAddress
        )
        expect(contractArbitrableTransactionData.arbitrator).toEqual(
          klerosPOCAddress
        )
        expect(contractArbitrableTransactionData.timeout).toEqual(
          arbitrableContractData.timeout
        )
        expect(contractArbitrableTransactionData.partyA).toEqual(
          arbitrableContractData.partyA
        )
        expect(contractArbitrableTransactionData.partyB).toEqual(
          arbitrableContractData.partyB
        )
        expect(contractArbitrableTransactionData.title).toEqual(
          arbitrableContractData.title
        )
        expect(contractArbitrableTransactionData.description).toEqual(
          arbitrableContractData.description
        )
        expect(contractArbitrableTransactionData.email).toEqual(
          arbitrableContractData.email
        )
      },
      10000
    )

    it(
      'Arbitrable Contract where partyA pays partyB',
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

        // FIXME use arbitrableTransaction
        const arbitrableContractInstance = await KlerosInstance.arbitrableTransaction.load(
          arbitrableContractAddress
        )
        const partyApaysPartyB = await arbitrableContractInstance.pay({
          from: partyA
        })

        expect(partyApaysPartyB.tx).toEqual(
          expect.stringMatching(/^0x[a-f0-9]{64}$/)
        ) // tx hash
      },
      50000
    )

    it(
      'dispute with a timeout call by partyA',
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
        const txHashRaiseDisputeByPartyA = await KlerosInstance.disputes.raiseDisputePartyA(
          partyA,
          arbitrableContractAddress,
          arbitrationCost -
            KlerosInstance._web3Wrapper.fromWei(
              partyAFeeContractInstance,
              'ether'
            )
        )
        expect(txHashRaiseDisputeByPartyA).toEqual(
          expect.stringMatching(/^0x[a-f0-9]{64}$/)
        ) // tx hash

        const delaySecond = () =>
          new Promise(resolve => {
            setTimeout(() => {
              resolve(true)
            }, 1000)
          })

        await delaySecond()

        // call timeout by partyA
        // TODO should test the api not directly the truffle contract
        const txHashTimeOutByPartyA = await arbitrableContractInstance.timeOutByPartyA(
          { from: partyA }
        )
        expect(txHashTimeOutByPartyA.tx).toEqual(
          expect.stringMatching(/^0x[a-f0-9]{64}$/)
        ) // tx hash
      },
      50000
    )
  })
})
