import DisputesApi from '../../../src/abstractWrappers/Disputes'

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

  beforeEach(async () => {
    disputesInstance = new DisputesApi(
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

  describe('getDisputesForUser', async () => {
    it('has wrong period', async () => {
      const mockGetDisputesForUser = jest.fn()
      const mockShouldNotCall = jest.fn()
      const mockDispute = {
        arbitratorAddress: arbitratorAddress,
        disputeId: '1'
      }
      const mockStoreProvider = {
        getDisputesForUser: mockGetDisputesForUser.mockReturnValue(
          _asyncMockResponse([mockDispute])
        ),
        setUpUserProfile: mockShouldNotCall
      }

      disputesInstance.setStoreProvider(mockStoreProvider)

      disputesInstance._Arbitrator.getPeriod = jest
        .fn()
        .mockReturnValue(_asyncMockResponse(0))
      disputesInstance._Arbitrator.getSession = jest
        .fn()
        .mockReturnValue(_asyncMockResponse(1))
      disputesInstance.getDataForDispute = jest
        .fn()
        .mockReturnValue(_asyncMockResponse(mockDispute))

      const disputes = await disputesInstance.getDisputesForUser(
        arbitratorAddress,
        account
      )

      expect(disputes.length).toBe(1)
      expect(disputes[0]).toEqual(mockDispute)
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
        getDisputesForUser: mockGetDisputesForUser.mockReturnValue(
          _asyncMockResponse([mockDispute])
        ),
        setUpUserProfile: mockSetUpUserProfile.mockReturnValue(
          _asyncMockResponse({
            session: 1
          })
        )
      }

      disputesInstance.setStoreProvider(mockStoreProvider)

      disputesInstance._Arbitrator.getPeriod = jest
        .fn()
        .mockReturnValue(_asyncMockResponse(2))
      disputesInstance._Arbitrator.getSession = jest
        .fn()
        .mockReturnValue(_asyncMockResponse(1))
      disputesInstance._Arbitrator.getDisputesForJuror = mockShouldNotCall
      disputesInstance.getDataForDispute = jest
        .fn()
        .mockReturnValue(_asyncMockResponse(mockDispute))

      const disputes = await disputesInstance.getDisputesForUser(
        arbitratorAddress,
        account
      )

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
      const mockUpdateStoreForDispute = jest.fn()
      const mockUpdateUserProfile = jest.fn()
      const mockDispute = {
        arbitratorAddress: arbitratorAddress,
        disputeId: '1'
      }
      const mockStoreProvider = {
        getDisputesForUser: mockGetDisputesForUser.mockReturnValue(
          _asyncMockResponse([mockDispute])
        ),
        setUpUserProfile: mockSetUpUserProfile.mockReturnValue(
          _asyncMockResponse({
            session: 1
          })
        ),
        updateUserProfile: mockUpdateUserProfile
      }

      disputesInstance.setStoreProvider(mockStoreProvider)

      disputesInstance._Arbitrator.getPeriod = jest
        .fn()
        .mockReturnValue(_asyncMockResponse(2))
      disputesInstance._Arbitrator.getSession = jest
        .fn()
        .mockReturnValue(_asyncMockResponse(2))
      disputesInstance._Arbitrator.getDisputesForJuror = mockGetDisputesForJuror.mockReturnValue(
        _asyncMockResponse([mockDispute])
      )
      disputesInstance.getDataForDispute = jest
        .fn()
        .mockReturnValue(_asyncMockResponse(mockDispute))
      disputesInstance._updateStoreForDispute = mockUpdateStoreForDispute
      disputesInstance.updateUserProfile = mockUpdateUserProfile

      const disputes = await disputesInstance.getDisputesForUser(
        arbitratorAddress,
        account
      )

      expect(disputes.length).toBe(1)
      expect(disputes[0]).toEqual(mockDispute)
      expect(mockGetDisputesForUser.mock.calls.length).toBe(1)

      expect(mockSetUpUserProfile.mock.calls.length).toBe(1)
      expect(mockSetUpUserProfile.mock.calls[0][0]).toBe(account)

      expect(mockGetDisputesForJuror.mock.calls.length).toBe(1)
      expect(mockGetDisputesForJuror.mock.calls[0][0]).toBe(arbitratorAddress)
      expect(mockGetDisputesForJuror.mock.calls[0][1]).toBe(account)

      expect(mockUpdateStoreForDispute.mock.calls.length).toBe(1)
      expect(mockUpdateStoreForDispute.mock.calls[0][0]).toBe(arbitratorAddress)
      expect(mockUpdateStoreForDispute.mock.calls[0][1]).toBe(
        mockDispute.disputeId
      )
      expect(mockUpdateStoreForDispute.mock.calls[0][2]).toBe(account)

      expect(mockUpdateUserProfile.mock.calls.length).toBe(1)
      expect(mockUpdateUserProfile.mock.calls[0][0]).toBe(account)
      expect(mockUpdateUserProfile.mock.calls[0][1]).toEqual({
        session: 2
      })
    })
  })
})
