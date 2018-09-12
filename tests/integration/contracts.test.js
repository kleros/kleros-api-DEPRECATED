import Web3 from 'web3'

import KlerosPOC from '../../src/contracts/implementations/arbitrator/KlerosPOC'
import MultipleArbitrableTransaction from '../../src/contracts/implementations/arbitrable/MultipleArbitrableTransaction'
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
      metaEvidenceUri: 'https://my-meta-evidence.ipfs.io'
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
      },
      10000
    )
    it(
      'create a arbitrable transaction',
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
        // arbitrable contract
        const ArbitrableTransactionInstance = new MultipleArbitrableTransaction(
          provider,
          arbitrableContractAddress
        )
        await ArbitrableTransactionInstance.createArbitrableTransaction(
          arbitrableContractData.partyA,
          klerosPOCAddress,
          arbitrableContractData.partyB,
          arbitrableContractData.value,
          arbitrableContractData.timeout,
          arbitrableContractData.extraData,
          arbitrableContractData.metaEvidenceUri
        )
        const transactionArbitrable0 = await ArbitrableTransactionInstance.getData(
          0
        )

        expect(transactionArbitrable0.seller).toEqual(arbitrableContractData.partyB)
        expect(transactionArbitrable0.buyer).toEqual(arbitrableContractData.partyA)
        expect(transactionArbitrable0.amount).toEqual(arbitrableContractData.value)
        expect(transactionArbitrable0.timeout).toEqual(arbitrableContractData.timeout)
        expect(transactionArbitrable0.disputeId).toEqual(0)
        expect(transactionArbitrable0.arbitrator).toEqual(klerosPOCAddress)
        expect(transactionArbitrable0.arbitratorExtraData).toEqual('0x')
        expect(transactionArbitrable0.sellerFee).toEqual(0)
        expect(transactionArbitrable0.buyerFee).toEqual(0)
        expect(transactionArbitrable0.lastInteraction).toBeDefined()
        expect(transactionArbitrable0.status).toEqual(0)
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

        const ArbitrableTransactionInstance = new MultipleArbitrableTransaction(
          provider,
          arbitrableContractAddress
        )

        // create a arbitrable transaction
        await ArbitrableTransactionInstance.createArbitrableTransaction(
          arbitrableContractData.partyA,
          klerosPOCAddress,
          arbitrableContractData.partyB,
          arbitrableContractData.value,
          arbitrableContractData.timeout,
          arbitrableContractData.extraData,
          arbitrableContractData.metaEvidenceUri
        )

        // buyer pays the seller
        const transactionArbitrable0 = await ArbitrableTransactionInstance.pay(
          arbitrableContractData.partyA,
          0,
          arbitrableContractData.value
        )

        expect(transactionArbitrable0.tx).toEqual(
          expect.stringMatching(/^0x[a-f0-9]{64}$/)
        ) // tx hash
      },
      50000
    )
    it(
      'dispute with a timeout call by the buyer',
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

        const ArbitrableTransactionInstance = new MultipleArbitrableTransaction(
          provider,
          arbitrableContractAddress
        )

        // create a arbitrable transaction
        await ArbitrableTransactionInstance.createArbitrableTransaction(
          arbitrableContractData.partyA,
          klerosPOCAddress,
          arbitrableContractData.partyB,
          arbitrableContractData.value,
          arbitrableContractData.timeout,
          arbitrableContractData.extraData,
          arbitrableContractData.metaEvidenceUri
        )

        const KlerosInstance = new KlerosPOC(provider, klerosPOCAddress)
        // return a bigint with the default value : 10000 wei fees in ether
        const arbitrationCost = await KlerosInstance.getArbitrationCost(
          arbitrableContractData.extraData
        )

        // buyer A pays fee
        const raiseDisputeByBuyerTxObj = await ArbitrableTransactionInstance.payArbitrationFeeByBuyer(
          arbitrableContractData.partyA,
          0,
          arbitrationCost
        )

        expect(raiseDisputeByBuyerTxObj.tx).toEqual(
          expect.stringMatching(/^0x[a-f0-9]{64}$/)
        ) // tx hash

        await delaySecond(2)
        // call timeout by the buyer
        const txHashTimeOutByBuyer = await ArbitrableTransactionInstance.callTimeOutBuyer(
          arbitrableContractData.partyA,
          0
        )
        expect(txHashTimeOutByBuyer.tx).toEqual(
          expect.stringMatching(/^0x[a-f0-9]{64}$/)
        ) // tx hash
      },
      50000
    )
    it(
      'dispute with an appeal call by the buyer',
      async () => {
        const [
          klerosPOCAddress,
          arbitrableContractAddress
        ] = await setUpContracts(
          provider,
          klerosPOCData,
          arbitrableContractData
        )
        await expect(klerosPOCAddress).toBeDefined()
        await expect(arbitrableContractAddress).toBeDefined()

        const ArbitrableTransactionInstance = new MultipleArbitrableTransaction(
          provider,
          arbitrableContractAddress
        )

        // create a arbitrable transaction
        await ArbitrableTransactionInstance.createArbitrableTransaction(
          arbitrableContractData.partyA,
          klerosPOCAddress,
          arbitrableContractData.partyB,
          arbitrableContractData.value,
          arbitrableContractData.timeout,
          arbitrableContractData.extraData,
          arbitrableContractData.metaEvidenceUri
        )

        const KlerosPOCInstance = await new KlerosPOC(provider, klerosPOCAddress)

        // // ****** Juror side (activate token) ****** //

        // jurors buy PNK
        const pnkAmount = '1000000000000000000'
        const buyPNKJurors = await Promise.all([
          await KlerosPOCInstance.buyPNK(pnkAmount, jurorContract1),
          await KlerosPOCInstance.buyPNK(pnkAmount, jurorContract2)
        ])

        const newBalance = await KlerosPOCInstance.getPNKBalance(jurorContract1)

        expect(newBalance.tokenBalance.toString()).toEqual(pnkAmount)

        // activate PNK jurors
        if (buyPNKJurors) {
          await KlerosPOCInstance.activatePNK(pnkAmount, jurorContract1)
          await KlerosPOCInstance.activatePNK(pnkAmount, jurorContract2)
        }

        // ****** Parties side (raise dispute) ****** //

        const KlerosInstance = new KlerosPOC(provider, klerosPOCAddress)
        // return a bigint with the default value : 10000 wei fees in ether
        const arbitrationCost = await KlerosInstance.getArbitrationCost(
          arbitrableContractData.extraData
        )

        // buyer A pays fee
        const raiseDisputeByBuyerTxObj = await ArbitrableTransactionInstance.payArbitrationFeeByBuyer(
          arbitrableContractData.partyA,
          0,
          arbitrationCost
        )

        expect(raiseDisputeByBuyerTxObj.tx).toEqual(
          expect.stringMatching(/^0x[a-f0-9]{64}$/)
        ) // tx hash

        // seller pays fee
        const raiseDisputeBySellerTxObj = await ArbitrableTransactionInstance.payArbitrationFeeBySeller(
          arbitrableContractData.partyB,
          0,
          arbitrationCost
        )

        expect(raiseDisputeBySellerTxObj.tx).toEqual(
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

        const currentRuling = await KlerosPOCInstance.currentRulingForDispute(0, 0)
        expect(currentRuling.toString()).toBeTruthy() // make sure the ruling exists

        const appealCost = await KlerosPOCInstance.getAppealCost(
          0,
          arbitrableContractData.extraData
        )

        // raise appeal party A
        const raiseAppealByPartyATxObj = await ArbitrableTransactionInstance.appeal(
          partyA,
          0,
          arbitrableContractData.extraData,
          appealCost
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
