import DisputesApi from '../../abstractWrappers/disputes'
import { NULL_ADDRESS, DEFAULT_ARBITRATION_COST } from '../../../constants'

describe('Disputes', () => {
  let mockArbitratorWrapper = {}
  let mockArbitrableContractWrapper = {}
  let arbitratorAddress = '0xDcB2db3E3fA7a6cba5dFE964408099d860246D7Z'
  let arbitrableConctractAddress = '0xEcB2db3E3fA7a6cba5dFE964408099d860246D7Z'
  let account = '0x'
  let disputesInstance

  const _asyncMockResponse = async response => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(response)
      }, 1000)
    })
  }

  const mockStore = {
    getUserProfile: jest.fn().mockReturnValue(_asyncMockResponse({})),
    newUserProfile: jest.fn().mockReturnValue(_asyncMockResponse({}))
  }

  beforeEach(async () => {
    disputesInstance = new DisputesApi(mockStore, mockArbitratorWrapper, mockArbitrableContractWrapper)

    mockArbitratorWrapper = {
      address: arbitratorAddress
    }

    mockArbitrableContractWrapper = {
      address: arbitrableConctractAddress
    }

    disputesInstance.setArbitrator = mockArbitratorWrapper
    disputesInstance.setArbitrable = mockArbitrableContractWrapper
  })

  test('getDisputesForJuror is juror', async () => {
    const session = 1
    const numberOfAppeals = 0
    const fakeDisputes = [
      {
        arbitratedContract: 'arbitrated-contract-address',
        firstSession: session,
        numberOfAppeals: numberOfAppeals,
        rulingChoices: 2,
        initialNumberJurors: 3,
        arbitrationFeePerJuror: DEFAULT_ARBITRATION_COST,
        state: 0
      },
      {
        arbitratedContract: NULL_ADDRESS
      }
    ]

    // mock get data
    disputesInstance._Arbitrator.getData = jest.fn().mockReturnValue(_asyncMockResponse(
      {
        session: session
      }
    ))

    // mock get dispute
    const mockGetDispute = async disputeId => {
      return fakeDisputes[disputeId]
    }
    disputesInstance._Arbitrator.getDispute = mockGetDispute

    // mock getVotesForJuror to say juror is selected
    disputesInstance.getVotesForJuror = jest.fn().mockReturnValue(_asyncMockResponse(
      [1]
    ))

    // mock getDataForDispute
    disputesInstance.getDataForDispute = jest.fn().mockReturnValue(_asyncMockResponse(
      fakeDisputes[0]
    ))

    const disputes = await disputesInstance.getDisputesForJuror(arbitratorAddress, account)
    // check on what was passed to mock get data
    expect(disputesInstance.getDataForDispute.mock.calls.length).toBe(1)
    expect(disputesInstance.getDataForDispute.mock.calls[0][0]).toBe(fakeDisputes[0].arbitratedContract)
    expect(disputesInstance.getDataForDispute.mock.calls[0][1]).toBe(account)
    // check results
    expect(disputes).toEqual([fakeDisputes[0]])
  })

  test('getDisputesForJuror not juror', async () => {
    const session = 1
    const numberOfAppeals = 0
    const fakeDisputes = [
      {
        arbitratedContract: 'arbitrated-contract-address',
        firstSession: session,
        numberOfAppeals: numberOfAppeals,
        rulingChoices: 2,
        initialNumberJurors: 3,
        arbitrationFeePerJuror: DEFAULT_ARBITRATION_COST,
        state: 0
      },
      {
        arbitratedContract: NULL_ADDRESS
      }
    ]

    // mock get data
    disputesInstance._Arbitrator.getData = jest.fn().mockReturnValue(_asyncMockResponse(
      {
        session: session
      }
    ))

    // mock get dispute
    const mockGetDispute = async disputeId => {
      return fakeDisputes[disputeId]
    }
    disputesInstance._Arbitrator.getDispute = mockGetDispute

    // mock getVotesForJuror to say juror has no votes
    disputesInstance.getVotesForJuror = jest.fn().mockReturnValue(_asyncMockResponse(
      []
    ))

    // mock getDataForDispute
    disputesInstance.getDataForDispute = jest.fn().mockReturnValue(_asyncMockResponse(
      fakeDisputes[0]
    ))

    const disputes = await disputesInstance.getDisputesForJuror(arbitratorAddress, account)
    // getDataForDispute should not be called
    expect(disputesInstance.getDataForDispute.mock.calls.length).toBe(0)
    // check results
    expect(disputes).toEqual([])
  })

  test('getDisputesForJuror case selected with appeal', async () => {
    const session = 1
    const numberOfAppeals = 1
    const fakeDisputes = [
      {
        arbitratedContract: 'arbitrated-contract-address',
        firstSession: session,
        numberOfAppeals: numberOfAppeals,
        rulingChoices: 2,
        initialNumberJurors: 3,
        arbitrationFeePerJuror: DEFAULT_ARBITRATION_COST,
        state: 0
      },
      {
        arbitratedContract: NULL_ADDRESS
      }
    ]

    // mock get data
    disputesInstance._Arbitrator.getData = jest.fn().mockReturnValue(_asyncMockResponse(
      {
        session: (session + numberOfAppeals)
      }
    ))

    // mock get dispute
    const mockGetDispute = async disputeId => {
      return fakeDisputes[disputeId]
    }
    disputesInstance._Arbitrator.getDispute = mockGetDispute

    // mock getVotesForJuror to say juror is selected
    disputesInstance.getVotesForJuror = jest.fn().mockReturnValue(_asyncMockResponse(
      [1]
    ))

    // mock getDataForDispute
    disputesInstance.getDataForDispute = jest.fn().mockReturnValue(_asyncMockResponse(
      fakeDisputes[0]
    ))

    const disputes = await disputesInstance.getDisputesForJuror(arbitratorAddress, account)
    // check on what was passed to mock get data
    expect(disputesInstance.getDataForDispute.mock.calls.length).toBe(1)
    expect(disputesInstance.getDataForDispute.mock.calls[0][0]).toBe(fakeDisputes[0].arbitratedContract)
    expect(disputesInstance.getDataForDispute.mock.calls[0][1]).toBe(account)
    // check results
    expect(disputes).toEqual([fakeDisputes[0]])
  })

  test('getDisputesForJuror wrong session', async () => {
    const session = 1
    const numberOfAppeals = 0
    const fakeDisputes = [
      {
        arbitratedContract: 'arbitrated-contract-address',
        firstSession: session,
        numberOfAppeals: numberOfAppeals,
        rulingChoices: 2,
        initialNumberJurors: 3,
        arbitrationFeePerJuror: DEFAULT_ARBITRATION_COST,
        state: 0
      },
      {
        arbitratedContract: NULL_ADDRESS
      }
    ]

    // mock get data
    disputesInstance._Arbitrator.getData = jest.fn().mockReturnValue(_asyncMockResponse(
      {
        session: session + 1
      }
    ))

    // mock get dispute
    const mockGetDispute = async disputeId => {
      return fakeDisputes[disputeId]
    }
    disputesInstance._Arbitrator.getDispute = mockGetDispute

    // mock getVotesForJuror to say juror has votes so we will know if it is getting further than we expect
    disputesInstance.getVotesForJuror = jest.fn().mockReturnValue(_asyncMockResponse(
      [1]
    ))

    // mock getDataForDispute
    disputesInstance.getDataForDispute = jest.fn().mockReturnValue(_asyncMockResponse(
      fakeDisputes[0]
    ))

    const disputes = await disputesInstance.getDisputesForJuror(arbitratorAddress, account)
    // getDataForDispute should not be called
    expect(disputesInstance.getDataForDispute.mock.calls.length).toBe(0)
    // check results
    expect(disputes).toEqual([])
  })
})
