import Web3 from 'web3'

import Kleros from '../../src/kleros'
import * as ethConstants from '../../src/constants/eth'

import { setUpContracts } from './helpers'

describe('Dispute Resolution', () => {
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
    'KlerosPOC full dispute resolution flow',
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

      // juror1 should have no balance to start with
      const initialBalance = await KlerosInstance.arbitrator.getPNKBalance(
        klerosPOCAddress,
        juror1
      )
      expect(initialBalance.tokenBalance).toEqual(0)
      // buy 1 PNK juror1
      const newBalance = await KlerosInstance.arbitrator.buyPNK(
        1,
        klerosPOCAddress,
        juror1
      )
      expect(newBalance.tokenBalance).toEqual(1)
      // buy PNK for juror2
      await KlerosInstance.arbitrator.buyPNK(1, klerosPOCAddress, juror2)

      // activate PNK juror1
      const activatedTokenAmount = 0.5
      const balance = await KlerosInstance.arbitrator.activatePNK(
        activatedTokenAmount,
        klerosPOCAddress,
        juror1
      )
      expect(balance.tokenBalance).toEqual(1)
      expect(balance.activatedTokens).toEqual(0.5)
      // activate PNK juror2
      await KlerosInstance.arbitrator.activatePNK(
        activatedTokenAmount,
        klerosPOCAddress,
        juror2
      )

      // load klerosPOC
      const klerosPOCInstance = await KlerosInstance.klerosPOC.load(klerosPOCAddress)

      const juror1Data = await klerosPOCInstance.jurors(juror1)
      expect(juror1Data[2].toNumber()).toEqual(
        (await klerosPOCInstance.session()).toNumber()
      )
      expect(juror1Data[4].toNumber() - juror1Data[3].toNumber()).toEqual(
        parseInt(web3.toWei(activatedTokenAmount, 'ether'), 10)
      )

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

      // return a bigint
      // FIXME use arbitrableTransaction
      const partyBFeeContractInstance = await arbitrableContractInstance.partyBFee()

      const txHashRaiseDisputeByPartyB = await KlerosInstance.disputes.raiseDisputePartyB(
        partyB,
        arbitrableContractAddress,
        arbitrationCost -
          KlerosInstance._web3Wrapper.fromWei(
            partyBFeeContractInstance,
            'ether'
          )
      )
      expect(txHashRaiseDisputeByPartyB).toEqual(
        expect.stringMatching(/^0x[a-f0-9]{64}$/)
      ) // tx hash

      const dispute = await KlerosInstance.klerosPOC.getDispute(
        klerosPOCAddress,
        0
      )
      expect(dispute.arbitratedContract).toEqual(
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
      const resolutionOptions = await KlerosInstance.disputes.getRulingOptions(
        klerosPOCAddress,
        0
      )
      expect(resolutionOptions.length).toEqual(2)

      // add an evidence for partyA
      const testName = 'test name'
      const testDesc = 'test description'
      const testURL = 'http://test.com'
      const txHashAddEvidence = await KlerosInstance.arbitrableContract.submitEvidence(
        partyA,
        arbitrableContractAddress,
        testName,
        testDesc,
        testURL
      )
      expect(txHashAddEvidence).toEqual(
        expect.stringMatching(/^0x[a-f0-9]{64}$/)
      ) // tx hash

      let contracts = await KlerosInstance.arbitrator.getContractsForUser(
        partyA
      )
      expect(contracts).toBeTruthy()

      const contractStoreData = await KlerosInstance.arbitrableContract.getData(
        arbitrableContractAddress,
        partyA
      )

      expect(contractStoreData.evidences[0].url).toBe(testURL)
      expect(contractStoreData.evidences[0].submittedAt).toBeTruthy()

      // check initial state of contract
      // FIXME var must be more explicit
      const initialState = await KlerosInstance.arbitrator.getData(
        klerosPOCAddress
      )
      expect(initialState.session).toEqual(1)
      expect(initialState.period).toEqual(0)

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
        expect(newState.period).toEqual(i)
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

      expect(drawA.length + drawB.length).toEqual(3)
      const disputesForJuror1 = await KlerosInstance.disputes.getDisputesForUser(
        klerosPOCAddress,
        juror1
      )
      const disputesForJuror2 = await KlerosInstance.disputes.getDisputesForUser(
        klerosPOCAddress,
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

      const currentRuling = await klerosPOCInstance.currentRuling(0)
      expect(`${currentRuling}`).toEqual(`${winningRuling}`)

      contracts = await KlerosInstance.arbitrator.getContractsForUser(partyA)
      expect(contracts).toBeTruthy()

      await delaySecond()
      await KlerosInstance.arbitrator.passPeriod(klerosPOCAddress, other)

      // balances before ruling is executed
      const partyABalance = web3.eth.getBalance(partyA).toNumber()
      const partyBBalance = web3.eth.getBalance(partyB).toNumber()
      // repartition tokens
      await KlerosInstance.klerosPOC.repartitionJurorTokens(
        klerosPOCAddress,
        0,
        other
      )

      // execute ruling
      await KlerosInstance.klerosPOC.executeRuling(
        klerosPOCAddress,
        0,
        other
      )
      // balances after ruling
      // partyA wins so they should recieve their arbitration fee as well as the value locked in contract
      if (winningRuling === rulingJuror1) {
        expect(web3.eth.getBalance(partyA).toNumber() - partyABalance).toEqual(
          KlerosInstance._web3Wrapper.toWei(arbitrationCost, 'ether') +
            arbitrableContractData.value
        )
        // partyB lost so their balance should remain the same
        expect(web3.eth.getBalance(partyB).toNumber()).toEqual(partyBBalance)
      } else {
        expect(web3.eth.getBalance(partyB).toNumber() - partyBBalance).toEqual(
          KlerosInstance._web3Wrapper.toWei(arbitrationCost, 'ether') +
            arbitrableContractData.value
        )
        // partyB lost so their balance should remain the same
        expect(web3.eth.getBalance(partyA).toNumber()).toEqual(partyABalance)
      }

      const updatedContractData = await KlerosInstance.arbitrableContract.getData(
        arbitrableContractAddress
      )
      expect(parseInt(updatedContractData.status, 10)).toEqual(4)
      KlerosInstance.eventListener.stopWatchingArbitratorEvents(
        klerosPOCAddress
      )
    },
    50000
  )
})
