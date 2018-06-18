import ArbitratorApi from '../../../../src/contracts/abstractions/Arbitrator'
import _asyncMockResponse from '../../../helpers/asyncMockResponse'

describe('Arbitrator', () => {
  let arbitratorAddress = '0xDcB2db3E3fA7a6cba5dFE964408099d860246D7Z'
  let account = '0x'
  let arbitratorInstance

  beforeEach(async () => {
    arbitratorInstance = new ArbitratorApi({}, {})
  })

  describe('getDisputesForUser', async () => {
    it('has wrong period', async () => {
      const mockGetDisputesForUser = jest.fn()
      const mockShouldNotCall = jest.fn()
      const mockDispute = {
        arbitratorAddress: arbitratorAddress,
        disputeId: '1'
      }
      const mockStoreProvider = {
        getDisputes: mockGetDisputesForUser.mockReturnValue(
          _asyncMockResponse([mockDispute])
        ),
        newUserProfile: mockShouldNotCall
      }

      arbitratorInstance.setStoreProviderInstance(mockStoreProvider)

      const mockArbitrator = {
        getPeriod: jest.fn().mockReturnValue(_asyncMockResponse(0)),
        getSession: jest.fn().mockReturnValue(_asyncMockResponse(1)),
        getDispute: jest.fn().mockReturnValue(_asyncMockResponse(mockDispute)),
        getContractAddress: jest.fn().mockReturnValue(arbitratorAddress)
      }
      arbitratorInstance._contractImplementation = mockArbitrator

      const disputes = await arbitratorInstance.getDisputesForUser(account)

      expect(disputes.length).toBe(1)
      expect(disputes[0]).toEqual(mockDispute)
      expect(mockGetDisputesForUser.mock.calls.length).toBe(1)
      expect(mockShouldNotCall.mock.calls.length).toBe(0)
    })

    it('has different arbitrator', async () => {
      const mockGetDisputesForUser = jest.fn()
      const mockShouldNotCall = jest.fn()
      const mockDispute = {
        arbitratorAddress: arbitratorAddress,
        disputeId: '1'
      }
      const mockStoreProvider = {
        getDisputes: mockGetDisputesForUser.mockReturnValue(
          _asyncMockResponse([mockDispute])
        ),
        newUserProfile: mockShouldNotCall
      }

      arbitratorInstance.setStoreProviderInstance(mockStoreProvider)

      const mockArbitrator = {
        getPeriod: jest.fn().mockReturnValue(_asyncMockResponse(0)),
        getSession: jest.fn().mockReturnValue(_asyncMockResponse(1)),
        getDispute: jest.fn().mockReturnValue(_asyncMockResponse(mockDispute)),
        getContractAddress: jest.fn().mockReturnValue(arbitratorAddress + 'x')
      }
      arbitratorInstance._contractImplementation = mockArbitrator

      const disputes = await arbitratorInstance.getDisputesForUser(account)

      expect(disputes.length).toBe(0)
      expect(mockGetDisputesForUser.mock.calls.length).toBe(1)
      expect(mockShouldNotCall.mock.calls.length).toBe(0)
    })

    it('has wrong session. already updated store', async () => {
      const mockGetDisputesForUser = jest.fn()
      const mockSetUpUserProfile = jest.fn()
      const mockShouldNotCall = jest.fn()
      const mockDispute = {
        arbitratorAddress: arbitratorAddress,
        disputeId: '1'
      }
      const mockStoreProvider = {
        getDisputes: mockGetDisputesForUser.mockReturnValue(
          _asyncMockResponse([mockDispute])
        ),
        newUserProfile: mockSetUpUserProfile.mockReturnValue(
          _asyncMockResponse({
            session: 1
          })
        )
      }

      arbitratorInstance.setStoreProviderInstance(mockStoreProvider)

      const mockArbitrator = {
        getPeriod: jest.fn().mockReturnValue(_asyncMockResponse(2)),
        getSession: jest.fn().mockReturnValue(_asyncMockResponse(1)),
        getDispute: jest.fn().mockReturnValue(_asyncMockResponse(mockDispute)),
        getContractAddress: jest.fn().mockReturnValue(arbitratorAddress)
      }
      arbitratorInstance._contractImplementation = mockArbitrator

      const disputes = await arbitratorInstance.getDisputesForUser(account)

      expect(disputes.length).toBe(1)
      expect(disputes[0]).toEqual(mockDispute)
      expect(mockGetDisputesForUser.mock.calls.length).toBe(1)
      expect(mockSetUpUserProfile.mock.calls.length).toBe(1)
      expect(mockShouldNotCall.mock.calls.length).toBe(0)
    })

    it('has new disputes', async () => {
      const mockGetDisputesForUser = jest.fn()
      const mockSetUpUserProfile = jest.fn()
      const mockGetDisputesForJuror = jest.fn()
      const mockUpdateDisputeProfile = jest.fn()
      const mockUpdateSession = jest.fn()
      const mockDispute = {
        arbitratorAddress: arbitratorAddress,
        disputeId: '1',
        appealDraws: [1]
      }
      const mockStoreProvider = {
        getDisputes: mockGetDisputesForUser.mockReturnValue(
          _asyncMockResponse([mockDispute])
        ),
        newUserProfile: mockSetUpUserProfile.mockReturnValue(
          _asyncMockResponse({
            session: 1
          })
        ),
        updateDisputeProfile: mockUpdateDisputeProfile,
        updateUserSession: mockUpdateSession
      }

      arbitratorInstance.setStoreProviderInstance(mockStoreProvider)

      const mockArbitrator = {
        getPeriod: jest.fn().mockReturnValue(_asyncMockResponse(2)),
        getSession: jest.fn().mockReturnValue(_asyncMockResponse(2)),
        getDispute: jest.fn().mockReturnValue(_asyncMockResponse(mockDispute)),
        getDisputesForJuror: mockGetDisputesForJuror.mockReturnValue(
          _asyncMockResponse([mockDispute])
        ),
        getDisputeCreationEvent: jest.fn().mockReturnValue({ blockNumber: 1 }),
        getContractAddress: jest.fn().mockReturnValue(arbitratorAddress)
      }
      arbitratorInstance._contractImplementation = mockArbitrator

      const disputes = await arbitratorInstance.getDisputesForUser(account)

      expect(disputes.length).toBe(1)
      expect(disputes[0]).toEqual(mockDispute)
      expect(mockGetDisputesForUser.mock.calls.length).toBe(1)

      expect(mockSetUpUserProfile.mock.calls.length).toBe(1)
      expect(mockSetUpUserProfile.mock.calls[0][0]).toBe(account)

      expect(mockGetDisputesForJuror.mock.calls.length).toBe(1)
      expect(mockGetDisputesForJuror.mock.calls[0][0]).toBe(account)

      expect(mockUpdateDisputeProfile.mock.calls.length).toBe(1)
      expect(mockUpdateDisputeProfile.mock.calls[0][0]).toBe(account)
      expect(mockUpdateDisputeProfile.mock.calls[0][1]).toBe(arbitratorAddress)
      expect(mockUpdateDisputeProfile.mock.calls[0][2]).toBe(
        mockDispute.disputeId
      )
      expect(mockUpdateDisputeProfile.mock.calls[0][3]).toEqual({
        appealDraws: mockDispute.appealDraws,
        blockNumber: 1
      })
      expect(mockUpdateSession.mock.calls.length).toBe(1)
    })
  })
})
