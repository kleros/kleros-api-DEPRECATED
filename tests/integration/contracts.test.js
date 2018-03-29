import Web3 from 'web3'

import Kleros from '../../src/kleros'
import * as ethConstants from '../../src/constants/eth'
import * as errorConstants from '../../src/constants/error'
import setUpContracts from '../helpers/setUpContracts'
import delaySecond from '../helpers/delaySecond'

describe('Contracts', () => {
  let partyA
  let partyB
  let other
  let web3
  let klerosPOCData
  let arbitrableContractData
  let provider

  beforeAll(async () => {
    // use testRPC
    provider = await new Web3.providers.HttpProvider(
      ethConstants.LOCALHOST_ETH_PROVIDER
    )

    web3 = await new Web3(provider)

    partyA = web3.eth.accounts[0]
    partyB = web3.eth.accounts[1]
    other = web3.eth.accounts[4]

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
      extraData: ''
    }
  })

  describe('KlerosPOC', async () => {
    it('deploys arbitrator with contractInstance', async () => {
      const KlerosInstance = new Kleros(undefined, provider)
      // deploy KlerosPOC with no PNK or RNG
      const newKlerosPOC = await KlerosInstance.arbitrator.deploy(
        '',
        '',
        klerosPOCData.timesPerPeriod,
        klerosPOCData.account,
        klerosPOCData.value
      )

      expect(newKlerosPOC.address).toBeTruthy()

      // Check that we can bootstrap with address
      const newKlerosInstance = await new Kleros(newKlerosPOC.address, provider)
      // this should load contract. Called in all KlerosPOC methods
      await newKlerosInstance.arbitrator._checkContractInstanceSet()
      const contractInstance = newKlerosInstance.arbitrator.getContractInstance()
      expect(contractInstance).toBeTruthy()
      expect(contractInstance.address).toEqual(newKlerosPOC.address)
    })
    it('load throws with bad address', async () => {
      const KlerosInstance = new Kleros(undefined, provider)
      // deploy KlerosPOC with no PNK or RNG
      const newKlerosPOC = await KlerosInstance.arbitrator.deploy(
        '',
        '',
        klerosPOCData.timesPerPeriod,
        klerosPOCData.account,
        klerosPOCData.value
      )

      expect(newKlerosPOC.address).toBeTruthy()

      try {
        await KlerosInstance.arbitrator.setArbitrator('badAddress')
      } catch (err) {
        expect(err.message).toEqual(errorConstants.UNABLE_TO_LOAD_ARBITRATOR)
      }
    })
    it('setArbitrator throws with undefined parameters', async () => {
      const KlerosInstance = new Kleros(undefined, provider)
      // deploy KlerosPOC with no PNK or RNG
      const newKlerosPOC = await KlerosInstance.arbitrator.deploy(
        '',
        '',
        klerosPOCData.timesPerPeriod,
        klerosPOCData.account,
        klerosPOCData.value
      )

      expect(newKlerosPOC.address).toBeTruthy()

      // make new Kleros
      const KlerosApi = KlerosInstance.contracts.arbitrator.KlerosPOC
      const noAddressKlerosPOC = new KlerosApi(KlerosInstance.getWeb3Wrapper())

      try {
        await noAddressKlerosPOC.setArbitrator()
      } catch (err) {
        expect(err.message).toEqual(errorConstants.UNABLE_TO_LOAD_ARBITRATOR)
      }
    })
  })

  describe('ArbitrableContract', async () => {
    it(
      'deploy a arbitrableTransaction contract',
      async () => {
        const KlerosInstance = new Kleros(undefined, provider)
        const [
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
        // KlerosPOC
        const klerosCourtData = await KlerosInstance.arbitrator.getData()
        expect(klerosCourtData.pinakionContractAddress).toEqual(pnkAddress)
        expect(klerosCourtData.rngContractAddress).toEqual(rngAddress)
        expect(klerosCourtData.period).toEqual(0)
        expect(klerosCourtData.session).toEqual(1)
        // arbitrable contract
        const contractArbitrableTransactionData = await KlerosInstance.arbitrableContracts.getData(
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
      },
      10000
    )

    it(
      'Arbitrable Contract where partyA pays partyB',
      async () => {
        const KlerosInstance = new Kleros(undefined, provider)
        const [
          klerosPOCAddress,
          arbitrableContractAddress
        ] = await setUpContracts(
          KlerosInstance,
          klerosPOCData,
          arbitrableContractData
        )

        expect(klerosPOCAddress).toBeDefined()
        expect(arbitrableContractAddress).toBeDefined()

        // FIXME use arbitrableTransaction
        const arbitrableContractInstance = await KlerosInstance.arbitrableContracts.load(
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
        const KlerosInstance = new Kleros(undefined, provider)
        const [
          klerosPOCAddress,
          arbitrableContractAddress
        ] = await setUpContracts(
          KlerosInstance,
          klerosPOCData,
          arbitrableContractData
        )
        expect(klerosPOCAddress).toBeDefined()
        expect(arbitrableContractAddress).toBeDefined()

        // return a bigint
        // FIXME use arbitrableTransaction
        const arbitrableContractInstance = await KlerosInstance.arbitrableContracts.load(
          arbitrableContractAddress
        )
        const partyAFeeContractInstance = await arbitrableContractInstance.partyAFee()

        // return bytes
        // FIXME use arbitrableTransaction
        let extraDataContractInstance = await arbitrableContractInstance.arbitratorExtraData()

        // return a bigint with the default value : 10000 wei fees in ether
        const arbitrationCost = await KlerosInstance.arbitrator.getArbitrationCost(
          extraDataContractInstance
        )

        // raise dispute party A
        const raiseDisputeByPartyATxObj = await KlerosInstance.arbitrableContracts.payArbitrationFeeByPartyA(
          partyA,
          arbitrableContractAddress,
          arbitrationCost -
            KlerosInstance._web3Wrapper.fromWei(
              partyAFeeContractInstance,
              'ether'
            )
        )
        expect(raiseDisputeByPartyATxObj.tx).toEqual(
          expect.stringMatching(/^0x[a-f0-9]{64}$/)
        ) // tx hash

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
