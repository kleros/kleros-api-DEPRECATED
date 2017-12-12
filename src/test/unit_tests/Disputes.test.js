import DisputesApi from '../../abstractWrappers/Disputes'
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

  test('getDisputeContractsForJuror is juror', async () => {
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
      }
    ]
    const fetchDispute = (disputeID) => {
      if (fakeDisputes[disputeID]) {
        return fakeDisputes[disputeID]
      } else {
        throw new Error("no dispute")
      }
    }

    // mock get data
    disputesInstance._Arbitrator.getData = jest.fn().mockReturnValue(_asyncMockResponse(
      {
        session: session
      }
    ))

    // mock get dispute
    const mockGetDispute = async (contractAddress, disputeId) => {
      return fetchDispute(disputeId)
    }
    disputesInstance._Arbitrator.getDispute = mockGetDispute

    // mock getVotesForJuror to say juror is selected
    disputesInstance.getVotesForJuror = jest.fn().mockReturnValue(_asyncMockResponse(
      [1]
    ))

    const disputes = await disputesInstance.getDisputeContractsForJuror(arbitratorAddress, account)
    // check results
    expect(disputes).toEqual([fakeDisputes[0].arbitratedContract])
  })

  test('getDisputeContractsForJuror not juror', async () => {
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
      }
    ]
    const fetchDispute = (disputeID) => {
      if (fakeDisputes[disputeID]) {
        return fakeDisputes[disputeID]
      } else {
        throw new Error("no dispute")
      }
    }

    // mock get data
    disputesInstance._Arbitrator.getData = jest.fn().mockReturnValue(_asyncMockResponse(
      {
        session: session
      }
    ))

    // mock get dispute
    const mockGetDispute = async (contractAddress, disputeId) => {
      return fetchDispute(disputeId)
    }
    disputesInstance._Arbitrator.getDispute = mockGetDispute

    // mock getVotesForJuror to say juror has no votes
    disputesInstance.getVotesForJuror = jest.fn().mockReturnValue(_asyncMockResponse(
      []
    ))

    const disputes = await disputesInstance.getDisputeContractsForJuror(arbitratorAddress, account)
    // check results
    expect(disputes).toEqual([])
  })

  test('getDisputeContractsForJuror case selected with appeal', async () => {
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
      }
    ]
    const fetchDispute = (disputeID) => {
      if (fakeDisputes[disputeID]) {
        return fakeDisputes[disputeID]
      } else {
        throw new Error("no dispute")
      }
    }

    // mock get data
    disputesInstance._Arbitrator.getData = jest.fn().mockReturnValue(_asyncMockResponse(
      {
        session: (session + numberOfAppeals)
      }
    ))

    // mock get dispute
    const mockGetDispute = async (contractAddress, disputeId) => {
      return fetchDispute(disputeId)
    }
    disputesInstance._Arbitrator.getDispute = mockGetDispute

    // mock getVotesForJuror to say juror is selected
    disputesInstance.getVotesForJuror = jest.fn().mockReturnValue(_asyncMockResponse(
      [1]
    ))

    const disputes = await disputesInstance.getDisputeContractsForJuror(arbitratorAddress, account)
    // check results
    expect(disputes).toEqual([fakeDisputes[0].arbitratedContract])
  })

  test('getDisputeContractsForJuror wrong session', async () => {
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
      }
    ]
    const fetchDispute = (disputeID) => {
      if (fakeDisputes[disputeID]) {
        return fakeDisputes[disputeID]
      } else {
        throw new Error("no dispute")
      }
    }

    // mock get data
    disputesInstance._Arbitrator.getData = jest.fn().mockReturnValue(_asyncMockResponse(
      {
        session: session + 1
      }
    ))

    // mock get dispute
    const mockGetDispute = async (contractAddress, disputeId) => {
      return fetchDispute(disputeId)
    }
    disputesInstance._Arbitrator.getDispute = mockGetDispute

    // mock getVotesForJuror to say juror has votes so we will know if it is getting further than we expect
    disputesInstance.getVotesForJuror = jest.fn().mockReturnValue(_asyncMockResponse(
      [1]
    ))

    const disputes = await disputesInstance.getDisputeContractsForJuror(arbitratorAddress, account)
    // check results
    expect(disputes).toEqual([])
  })
})
