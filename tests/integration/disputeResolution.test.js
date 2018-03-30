import Web3 from 'web3'

import KlerosPOC from '../../src/contractWrappers/arbitrator/KlerosPOC'
import ArbitrableTransaction from '../../src/contractWrappers/arbitrableContracts/ArbitrableTransaction'
import * as ethConstants from '../../src/constants/eth'
import setUpContracts from '../helpers/setUpContracts'
import delaySecond from '../helpers/delaySecond'

describe('Dispute Resolution', () => {
  let partyA
  let partyB
  let juror1
  let juror2
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

    partyA = web3.eth.accounts[6]
    partyB = web3.eth.accounts[7]
    juror1 = web3.eth.accounts[8]
    juror2 = web3.eth.accounts[9]
    other = web3.eth.accounts[10]

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
  })

  it(
    'KlerosPOC full dispute resolution flow',
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
      const ArbitrableTransactionInstance = new ArbitrableTransaction(provider)
      // juror1 should have no balance to start with
      const initialBalance = await KlerosPOCInstance.getPNKBalance(juror1)
      expect(initialBalance.tokenBalance).toEqual(0)
      // buy 1 PNK juror1
      await KlerosPOCInstance.buyPNK(1, juror1)

      const newBalance = await KlerosPOCInstance.getPNKBalance(juror1)

      expect(newBalance.tokenBalance).toEqual(1)
      // buy PNK for juror2
      await KlerosPOCInstance.buyPNK(1, juror2)

      // activate PNK juror1
      const activatedTokenAmount = 0.5
      const balance = await KlerosPOCInstance.activatePNK(
        activatedTokenAmount,
        juror1
      )
      expect(balance.tokenBalance).toEqual(1)
      expect(balance.activatedTokens).toEqual(0.5)
      // activate PNK juror2
      await KlerosPOCInstance.activatePNK(activatedTokenAmount, juror2)

      // load klerosPOC
      const klerosPOCInstance = await KlerosPOCInstance.loadContract()

      const juror1Data = await klerosPOCInstance.jurors(juror1)
      expect(juror1Data[2].toNumber()).toEqual(
        (await klerosPOCInstance.session()).toNumber()
      )
      expect(juror1Data[4].toNumber() - juror1Data[3].toNumber()).toEqual(
        parseInt(web3.toWei(activatedTokenAmount, 'ether'), 10)
      )
      // return a bigint
      // FIXME use arbitrableTransaction
      const arbitrableContractInstance = await ArbitrableTransactionInstance.load(
        arbitrableContractAddress
      )
      const partyAFeeContractInstance = await arbitrableContractInstance.partyAFee()

      // return bytes
      // FIXME use arbitrableTransaction
      let extraDataContractInstance = await arbitrableContractInstance.arbitratorExtraData()

      // return a bigint with the default value : 10000 wei fees in ether
      const arbitrationCost = await KlerosPOCInstance.getArbitrationCost(
        extraDataContractInstance
      )

      // raise dispute party A
      const raiseDisputeByPartyATxObj = await ArbitrableTransactionInstance.payArbitrationFeeByPartyA(
        partyA,
        arbitrableContractAddress,
        arbitrationCost -
          web3.fromWei(partyAFeeContractInstance, 'ether').toNumber()
      )
      expect(raiseDisputeByPartyATxObj.tx).toEqual(
        expect.stringMatching(/^0x[a-f0-9]{64}$/)
      ) // tx hash

      // return a bigint
      // FIXME use arbitrableTransaction
      const partyBFeeContractInstance = await arbitrableContractInstance.partyBFee()

      const raiseDisputeByPartyBTxObj = await ArbitrableTransactionInstance.payArbitrationFeeByPartyB(
        partyB,
        arbitrableContractAddress,
        arbitrationCost -
          web3.fromWei(partyBFeeContractInstance, 'ether').toNumber()
      )
      expect(raiseDisputeByPartyBTxObj.tx).toEqual(
        expect.stringMatching(/^0x[a-f0-9]{64}$/)
      ) // tx hash
      const dispute = await KlerosPOCInstance.getDispute(0)
      expect(dispute.arbitrableContractAddress).toEqual(
        arbitrableContractAddress
      )
      expect(dispute.firstSession).toEqual(
        (await klerosPOCInstance.session()).toNumber()
      )
      expect(dispute.numberOfAppeals).toEqual(0)
      expect(dispute.voteCounters).toEqual(
        new Array(dispute.numberOfAppeals + 1).fill(
          new Array(dispute.rulingChoices + 1).fill(0)
        )
      )

      // check fetch resolution options
      const resolutionOptions = await ArbitrableTransactionInstance.getRulingOptions(
        arbitrableContractAddress,
        klerosPOCAddress,
        0
      )
      expect(resolutionOptions.length).toEqual(2)
      // add an evidence for partyA
      const testName = 'test name'
      const testDesc = 'test description'
      const testURL = 'http://test.com'
      const txHashAddEvidence = await ArbitrableTransactionInstance.submitEvidence(
        partyA,
        arbitrableContractAddress,
        testName,
        testDesc,
        testURL
      )
      expect(txHashAddEvidence).toEqual(
        expect.stringMatching(/^0x[a-f0-9]{64}$/)
      ) // tx hash

      // check initial state of contract
      // FIXME var must be more explicit
      const initialState = await KlerosPOCInstance.getData()
      expect(initialState.session).toEqual(1)
      expect(initialState.period).toEqual(0)

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
        await KlerosPOCInstance.passPeriod()

        newPeriod = await KlerosPOCInstance.getPeriod()
        expect(newPeriod).toEqual(i)
      }
      let drawA = []
      let drawB = []
      for (let i = 1; i <= 3; i++) {
        if (await KlerosPOCInstance.isJurorDrawnForDispute(0, i, juror1)) {
          drawA.push(i)
        } else {
          drawB.push(i)
        }
      }

      expect(drawA.length + drawB.length).toEqual(3)
      const disputesForJuror1 = await KlerosPOCInstance.getDisputesForJuror(
        juror1
      )
      const disputesForJuror2 = await KlerosPOCInstance.getDisputesForJuror(
        juror2
      )
      expect(
        disputesForJuror1.length > 0 || disputesForJuror2.length > 0
      ).toBeTruthy()
      const disputeForJuror =
        disputesForJuror1.length > 0
          ? disputesForJuror1[0]
          : disputesForJuror2[0]
      expect(disputeForJuror.arbitrableContractAddress).toEqual(
        arbitrableContractAddress
      )

      // submit rulings
      const rulingJuror1 = 1
      await KlerosPOCInstance.submitVotes(0, rulingJuror1, drawA, juror1)
      const rulingJuror2 = 2
      await KlerosPOCInstance.submitVotes(0, rulingJuror2, drawB, juror2)
      const winningRuling =
        drawA.length > drawB.length ? rulingJuror1 : rulingJuror2

      await delaySecond()
      await KlerosPOCInstance.passPeriod(other)

      const currentRuling = await klerosPOCInstance.currentRuling(0)
      expect(`${currentRuling}`).toEqual(`${winningRuling}`)

      await delaySecond()
      await KlerosPOCInstance.passPeriod(other)

      // balances before ruling is executed
      const partyABalance = web3.eth.getBalance(partyA).toNumber()
      const partyBBalance = web3.eth.getBalance(partyB).toNumber()
      // repartition tokens
      await KlerosPOCInstance.repartitionJurorTokens(0, other)
      // execute ruling
      await KlerosPOCInstance.executeRuling(0, other)
      // balances after ruling
      // partyA wins so they should recieve their arbitration fee as well as the value locked in contract

      if (winningRuling === rulingJuror1) {
        expect(web3.eth.getBalance(partyA).toNumber() - partyABalance).toEqual(
          KlerosPOCInstance._Web3Wrapper.toWei(arbitrationCost, 'ether') +
            arbitrableContractData.value
        )
        // partyB lost so their balance should remain the same
        expect(web3.eth.getBalance(partyB).toNumber()).toEqual(partyBBalance)
      } else {
        expect(web3.eth.getBalance(partyB).toNumber() - partyBBalance).toEqual(
          KlerosPOCInstance._Web3Wrapper.toWei(arbitrationCost, 'ether') +
            arbitrableContractData.value
        )
        // partyB lost so their balance should remain the same
        expect(web3.eth.getBalance(partyA).toNumber()).toEqual(partyABalance)
      }

      const updatedContractData = await ArbitrableTransactionInstance.getData(
        arbitrableContractAddress
      )
      expect(parseInt(updatedContractData.status, 10)).toEqual(4)
    },
    100000
  )
})
