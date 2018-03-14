import DisputesApi from '../../../src/abstractWrappers/Disputes'
import * as arbitratorConstants from '../../../src/constants/arbitrator'

describe('Disputes', () => {
  let mockArbitratorWrapper = {}
  let mockArbitrableContractWrapper = {}
  let arbitratorAddress = '0xDcB2db3E3fA7a6cba5dFE964408099d860246D7Z'
  let arbitrableConctractAddress = '0xEcB2db3E3fA7a6cba5dFE964408099d860246D7Z'
  let account = '0x'
  let disputesInstance

  const _asyncMockResponse = response =>
    new Promise(resolve => {
      setTimeout(() => {
        resolve(response)
      }, 1000)
    })

  const mockStore = {
    getUserProfile: jest.fn().mockReturnValue(_asyncMockResponse({})),
    updateUserProfile: jest.fn().mockReturnValue(_asyncMockResponse({}))
  }

  beforeEach(async () => {
    disputesInstance = new DisputesApi(
      mockStore,
      mockArbitratorWrapper,
      mockArbitrableContractWrapper
    )

    mockArbitratorWrapper = {
      address: arbitratorAddress
    }

    mockArbitrableContractWrapper = {
      address: arbitrableConctractAddress
    }

    disputesInstance.setArbitrator = mockArbitratorWrapper
    disputesInstance.setArbitrable = mockArbitrableContractWrapper
  })

  describe('getDisputesForJuror', () => {
    test('is juror', async () => {
      const session = 1
      const numberOfAppeals = 0
      const fakeDisputes = [
        {
          arbitratedContract: 'arbitrated-contract-address',
          firstSession: session,
          numberOfAppeals: numberOfAppeals,
          rulingChoices: 2,
          initialNumberJurors: 3,
          arbitrationFeePerJuror: arbitratorConstants.DEFAULT_ARBITRATION_FEE,
          state: 0
        }
      ]
      const fetchDispute = disputeID => {
        if (fakeDisputes[disputeID]) {
          return fakeDisputes[disputeID]
        } else {
          throw new Error('no dispute')
        }
      }

      // mock get data
      disputesInstance._Arbitrator.getData = jest.fn().mockReturnValue(
        _asyncMockResponse({
          session: session
        })
      )

      // mock get dispute
      const mockGetDispute = async (_contractAddress, disputeId) =>
        fetchDispute(disputeId)

      disputesInstance._Arbitrator.getDispute = mockGetDispute

      // mock getDrawsForJuror to say juror is selected
      disputesInstance.getDrawsForJuror = jest
        .fn()
        .mockReturnValue(_asyncMockResponse([1]))

      const disputes = await disputesInstance.getDisputesForJuror(
        arbitratorAddress,
        account
      )
      // check results
      expect(disputes).toEqual([0])
    })

    test('not juror', async () => {
      const session = 1
      const numberOfAppeals = 0
      const fakeDisputes = [
        {
          arbitratedContract: 'arbitrated-contract-address',
          firstSession: session,
          numberOfAppeals: numberOfAppeals,
          rulingChoices: 2,
          initialNumberJurors: 3,
          arbitrationFeePerJuror: arbitratorConstants.DEFAULT_ARBITRATION_FEE,
          state: 0
        }
      ]
      const fetchDispute = disputeID => {
        if (fakeDisputes[disputeID]) {
          return fakeDisputes[disputeID]
        } else {
          throw new Error('no dispute')
        }
      }

      // mock get data
      disputesInstance._Arbitrator.getData = jest.fn().mockReturnValue(
        _asyncMockResponse({
          session: session
        })
      )

      // mock get dispute
      const mockGetDispute = async (_contractAddress, disputeId) =>
        fetchDispute(disputeId)

      disputesInstance._Arbitrator.getDispute = mockGetDispute

      // mock getDrawsForJuror to say juror has no votes
      disputesInstance.getDrawsForJuror = jest
        .fn()
        .mockReturnValue(_asyncMockResponse([]))

      const disputes = await disputesInstance.getDisputesForJuror(
        arbitratorAddress,
        account
      )
      // check results
      expect(disputes).toEqual([])
    })

    test('case selected with appeal', async () => {
      const session = 1
      const numberOfAppeals = 1
      const fakeDisputes = [
        {
          arbitratedContract: 'arbitrated-contract-address',
          firstSession: session,
          numberOfAppeals: numberOfAppeals,
          rulingChoices: 2,
          initialNumberJurors: 3,
          arbitrationFeePerJuror: arbitratorConstants.DEFAULT_ARBITRATION_FEE,
          state: 0
        }
      ]
      const fetchDispute = disputeID => {
        if (fakeDisputes[disputeID]) {
          return fakeDisputes[disputeID]
        } else {
          throw new Error('no dispute')
        }
      }

      // mock get data
      disputesInstance._Arbitrator.getData = jest.fn().mockReturnValue(
        _asyncMockResponse({
          session: session + numberOfAppeals
        })
      )

      // mock get dispute
      const mockGetDispute = async (_contractAddress, disputeId) =>
        fetchDispute(disputeId)

      disputesInstance._Arbitrator.getDispute = mockGetDispute

      // mock getDrawsForJuror to say juror is selected
      disputesInstance.getDrawsForJuror = jest
        .fn()
        .mockReturnValue(_asyncMockResponse([1]))

      const disputes = await disputesInstance.getDisputesForJuror(
        arbitratorAddress,
        account
      )
      // check results
      expect(disputes).toEqual([0])
    })

    test('wrong session', async () => {
      const session = 1
      const numberOfAppeals = 0
      const fakeDisputes = [
        {
          arbitratedContract: 'arbitrated-contract-address',
          firstSession: session,
          numberOfAppeals: numberOfAppeals,
          rulingChoices: 2,
          initialNumberJurors: 3,
          arbitrationFeePerJuror: arbitratorConstants.DEFAULT_ARBITRATION_FEE,
          state: 0
        }
      ]
      const fetchDispute = disputeID => {
        if (fakeDisputes[disputeID]) {
          return fakeDisputes[disputeID]
        } else {
          throw new Error('no dispute')
        }
      }

      // mock get data
      disputesInstance._Arbitrator.getData = jest.fn().mockReturnValue(
        _asyncMockResponse({
          session: session + 1
        })
      )

      // mock get dispute
      const mockGetDispute = async (_contractAddress, disputeId) =>
        fetchDispute(disputeId)

      disputesInstance._Arbitrator.getDispute = mockGetDispute

      // mock getDrawsForJuror to say juror has votes so we will know if it is getting further than we expect
      disputesInstance.getDrawsForJuror = jest
        .fn()
        .mockReturnValue(_asyncMockResponse([1]))

      const disputes = await disputesInstance.getDisputesForJuror(
        arbitratorAddress,
        account
      )
      // check results
      expect(disputes).toEqual([])
    })
  })

  describe('getEvidenceForArbitrableContract', async () => {
    test('merge evidence', async () => {
      const partyA = 'partyAAddress'
      const partyB = 'partyBAddress'

      const userContracts = {
        [partyA]: {
          evidences: [
            {
              name: 'partyAName',
              description: 'partyADescription',
              url: 'partyAURL'
            }
          ]
        },
        [partyB]: {
          evidences: [
            {
              name: 'partyBName',
              description: 'partyBDescription',
              url: 'partyBURL'
            }
          ]
        }
      }
      disputesInstance._StoreProvider.getContractByAddress = account =>
        userContracts[account]

      disputesInstance._ArbitrableContract.getData = jest.fn().mockReturnValue(
        _asyncMockResponse({
          partyA: partyA,
          partyB
        })
      )

      const result = await disputesInstance.getEvidenceForArbitrableContract(
        'fakeAddress'
      )
      expect(result.length).toEqual(2)
      expect(result[0].submitter).not.toEqual(result[1].submitter)
      result.forEach(evidence => {
        const submitter = evidence.submitter
        expect(evidence.name).toBe(userContracts[submitter].evidences[0].name)
        expect(evidence.description).toBe(
          userContracts[submitter].evidences[0].description
        )
        expect(evidence.url).toBe(userContracts[submitter].evidences[0].url)
      })
    })

    test('no evidence partyA', async () => {
      const partyA = 'partyAAddress'
      const partyB = 'partyBAddress'

      const userContracts = {
        [partyB]: {
          evidences: [
            {
              name: 'partyBName',
              description: 'partyBDescription',
              url: 'partyBURL'
            }
          ]
        }
      }
      disputesInstance._StoreProvider.getContractByAddress = account =>
        userContracts[account]

      disputesInstance._ArbitrableContract.getData = jest.fn().mockReturnValue(
        _asyncMockResponse({
          partyA: partyA,
          partyB
        })
      )

      const result = await disputesInstance.getEvidenceForArbitrableContract(
        'fakeAddress'
      )
      expect(result.length).toEqual(1)
      expect(result[0].submitter).toBeTruthy()

      const submitter = result[0].submitter
      expect(result[0].name).toBe(userContracts[submitter].evidences[0].name)
      expect(result[0].description).toBe(
        userContracts[submitter].evidences[0].description
      )
      expect(result[0].url).toBe(userContracts[submitter].evidences[0].url)
    })
  })
})
