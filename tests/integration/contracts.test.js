import Web3 from 'web3'

import KlerosPOC from '../../src/contracts/implementations/arbitrator/KlerosPOC'
import ArbitrableTransaction from '../../src/contracts/implementations/arbitrable/ArbitrableTransaction'
import * as ethConstants from '../../src/constants/eth'
import * as errorConstants from '../../src/constants/error'
import setUpContracts from '../helpers/setUpContracts'
import delaySecond from '../helpers/delaySecond'

describe('Contracts', () => {
  let partyA
  let partyB
  let jurorContract1
  let jurorContract2
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
    other = web3.eth.accounts[2]

    // these accounts are not used
    jurorContract1 = web3.eth.accounts[11]
    jurorContract2 = web3.eth.accounts[12]

    klerosPOCData = {
      timesPerPeriod: [1, 1, 1, 1, 1], // activation, draw, vote, appeal, execution (seconds)
      account: other,
      value: 0
    }

    arbitrableContractData = {
      partyA,
      partyB,
      value: 0,
      timeout: 1,
      extraData: '',
      metaEvidenceUri: 'https://test-meta-evidence.com'
    }
  })

  describe('KlerosPOC', async () => {
    it('deploys arbitrator with contractInstance', async () => {
      const newKlerosPOC = await KlerosPOC.deploy(
        '', // rngAddress param
        '', // pnkAddress param
        klerosPOCData.timesPerPeriod,
        klerosPOCData.account,
        klerosPOCData.value,
        provider
      )

      expect(newKlerosPOC.address).toBeTruthy()

      // Check that we can bootstrap with address
      const newKlerosInstance = new KlerosPOC(provider, newKlerosPOC.address)
      const contractInstance = await newKlerosInstance.loadContract()
      // this should load contract. Called in all KlerosPOC methods
      expect(contractInstance).toBeTruthy()
      expect(contractInstance.address).toEqual(newKlerosPOC.address)
    })
    it('initializing contract with bad address fails', async () => {
      const newKlerosPOC = new KlerosPOC(provider, 0x0) // bad address param
      try {
        // Check that we can bootstrap with address
        await newKlerosPOC.loadContract()
      } catch (err) {
        expect(err.message).toEqual(errorConstants.CONTRACT_INSTANCE_NOT_SET)
      }
    })
    it('setContractInstance throws with undefined parameters', async () => {
      const newKlerosPOC = await KlerosPOC.deploy(
        '', // rngAddress param
        '', // pnkAddress param
        klerosPOCData.timesPerPeriod,
        klerosPOCData.account,
        klerosPOCData.value,
        provider
      )

      expect(newKlerosPOC.address).toBeTruthy()

      // Check that we can bootstrap with address
      const newKlerosInstance = new KlerosPOC(provider, newKlerosPOC.address)

      try {
        await newKlerosInstance.setContractInstance()
      } catch (err) {
        expect(err.message).toEqual(errorConstants.UNABLE_TO_LOAD_CONTRACT)
      }
    })
    it('throws if we initialize KlerosPOC without an address', async () => {
      try {
        const _ = new KlerosPOC(provider)
      } catch (err) {
        expect(err.message).toEqual(
          errorConstants.MISSING_PARAMETERS('contractAddress')
        )
      }
    })
  })

  describe('ArbitrableTransaction', async () => {
    it(
      'deploy a arbitrableTransaction contract',
      async () => {
        const [
          klerosPOCAddress,
          arbitrableContractAddress,
          rngAddress,
          pnkAddress
        ] = await setUpContracts(
          provider,
          klerosPOCData,
          arbitrableContractData
        )
        expect(klerosPOCAddress).toBeDefined()
        expect(arbitrableContractAddress).toBeDefined()
        expect(rngAddress).toBeDefined()
        expect(pnkAddress).toBeDefined()

        // KlerosPOC
        const KlerosPOCInstance = new KlerosPOC(provider, klerosPOCAddress)
        const klerosCourtData = await KlerosPOCInstance.getData()
        expect(klerosCourtData.pinakionContractAddress).toEqual(pnkAddress)
        expect(klerosCourtData.rngContractAddress).toEqual(rngAddress)
        expect(klerosCourtData.period).toEqual(0)
        expect(klerosCourtData.session).toEqual(1)
        // // arbitrable contract
        const ArbitrableTransactionInstanceInstance = new ArbitrableTransaction(
          provider,
          arbitrableContractAddress
        )

        const contractArbitrableTransactionData = await ArbitrableTransactionInstanceInstance.getData(
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
        const [
          klerosPOCAddress,
          arbitrableContractAddress
        ] = await setUpContracts(
          provider,
          klerosPOCData,
          arbitrableContractData
        )

        expect(klerosPOCAddress).toBeDefined()
        expect(arbitrableContractAddress).toBeDefined()

        // FIXME use arbitrableTransaction
        const ArbitrableTransactionInstance = new ArbitrableTransaction(
          provider,
          arbitrableContractAddress
        )
        const arbitrableContractInstance = await ArbitrableTransactionInstance.loadContract()
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
        const [
          klerosPOCAddress,
          arbitrableContractAddress
        ] = await setUpContracts(
          provider,
          klerosPOCData,
          arbitrableContractData
        )
        expect(klerosPOCAddress).toBeDefined()
        expect(arbitrableContractAddress).toBeDefined()

        // return a bigint
        // FIXME use arbitrableTransaction
        const ArbitrableTransactionInstance = new ArbitrableTransaction(
          provider,
          arbitrableContractAddress
        )
        const arbitrableContractInstance = await ArbitrableTransactionInstance.loadContract()
        const partyAFeeContractInstance = await arbitrableContractInstance.partyAFee()

        // return bytes
        // FIXME use arbitrableTransaction
        let extraDataContractInstance = await arbitrableContractInstance.arbitratorExtraData()

        const KlerosInstance = new KlerosPOC(provider, klerosPOCAddress)
        // return a bigint with the default value : 10000 wei fees in ether
        const arbitrationCost = await KlerosInstance.getArbitrationCost(
          extraDataContractInstance
        )

        // raise dispute party A
        const raiseDisputeByPartyATxObj = await ArbitrableTransactionInstance.payArbitrationFeeByPartyA(
          partyA,
          arbitrationCost -
            web3.fromWei(partyAFeeContractInstance, 'ether').toNumber()
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
    it(
      'dispute with an appeal call by partyA',
      async () => {
        // deploy klerosPOC and arbitrableContract contracts
        const [
          klerosPOCAddress,
          arbitrableContractAddress
        ] = await setUpContracts(
          provider,
          klerosPOCData,
          arbitrableContractData
        )
        expect(klerosPOCAddress).toBeDefined()
        expect(arbitrableContractAddress).toBeDefined()

        const KlerosPOCInstance = new KlerosPOC(provider, klerosPOCAddress)

        // return a bigint
        // FIXME use arbitrableTransaction
        const ArbitrableTransactionInstance = new ArbitrableTransaction(
          provider,
          arbitrableContractAddress
        )

        // ****** Juror side (activate token) ****** //

        // jurors buy PNK
        const pnkAmount = '1000000000000000000'
        const buyPNKJurors = await Promise.all([
          KlerosPOCInstance.buyPNK(pnkAmount, jurorContract1),
          await KlerosPOCInstance.buyPNK(pnkAmount, jurorContract2)
        ])

        const newBalance = await KlerosPOCInstance.getPNKBalance(jurorContract1)

        expect(newBalance.tokenBalance.toString()).toEqual(pnkAmount)

        // activate PNK jurors
        if (buyPNKJurors) {
          await KlerosPOCInstance.activatePNK(pnkAmount, jurorContract1)
          await KlerosPOCInstance.activatePNK(pnkAmount, jurorContract2)
        }

        // load klerosPOC
        const klerosPOCInstance = await KlerosPOCInstance.loadContract()

        // ****** Parties side (raise dispute) ****** //

        const arbitrableContractInstance = await ArbitrableTransactionInstance.loadContract()

        const partyAFeeContractInstance = await arbitrableContractInstance.partyAFee()
        const partyBFeeContractInstance = await arbitrableContractInstance.partyBFee()

        // return bytes
        // FIXME use arbitrableTransaction
        let extraDataContractInstance = await arbitrableContractInstance.arbitratorExtraData()

        const KlerosInstance = new KlerosPOC(provider, klerosPOCAddress)
        // return a bigint with the default value : 10000 wei fees in ether
        const arbitrationCost = await KlerosInstance.getArbitrationCost(
          extraDataContractInstance
        )

        // raise dispute party A
        const raiseDisputeByPartyATxObj = await ArbitrableTransactionInstance.payArbitrationFeeByPartyA(
          partyA,
          arbitrationCost.minus(partyAFeeContractInstance)
        )
        expect(raiseDisputeByPartyATxObj.tx).toEqual(
          expect.stringMatching(/^0x[a-f0-9]{64}$/)
        ) // tx hash

        // raise dispute party B
        const raiseDisputeByPartyBTxObj = await ArbitrableTransactionInstance.payArbitrationFeeByPartyB(
          partyB,
          arbitrationCost.minus(partyBFeeContractInstance)
        )
        expect(raiseDisputeByPartyBTxObj.tx).toEqual(
          expect.stringMatching(/^0x[a-f0-9]{64}$/)
        ) // tx hash

        // ****** Juror side (pass period) ****** //

        let newPeriod
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
          await KlerosPOCInstance.passPeriod(other)

          newPeriod = await KlerosPOCInstance.getPeriod()
          expect(newPeriod).toEqual(i)
        }

        let drawA = []
        let drawB = []
        for (let i = 1; i <= 3; i++) {
          if (
            await KlerosPOCInstance.isJurorDrawnForDispute(0, i, jurorContract1)
          ) {
            drawA.push(i)
          } else {
            drawB.push(i)
          }
        }

        const rulingJuror1 = 1 // vote for partyA
        await KlerosPOCInstance.submitVotes(
          0,
          rulingJuror1,
          drawA,
          jurorContract1
        )

        const rulingJuror2 = 2 // vote for partyB
        await KlerosPOCInstance.submitVotes(
          0,
          rulingJuror2,
          drawB,
          jurorContract2
        )
        await delaySecond()
        await KlerosPOCInstance.passPeriod(other)

        const currentRuling = await klerosPOCInstance.currentRuling(0)
        expect(currentRuling.toString()).toBeTruthy() // make sure the ruling exists

        const appealCost = await KlerosPOCInstance.getAppealCost(
          0,
          extraDataContractInstance
        )
        // raise appeal party A
        const raiseAppealByPartyATxObj = await ArbitrableTransactionInstance.appeal(
          partyA,
          appealCost,
          extraDataContractInstance
        )
        expect(raiseAppealByPartyATxObj.tx).toEqual(
          expect.stringMatching(/^0x[a-f0-9]{64}$/)
        ) // tx hash

        const dispute = await KlerosPOCInstance.getDispute(0)
        expect(dispute.numberOfAppeals).toEqual(1)
      },
      50000
    )
  })
})
