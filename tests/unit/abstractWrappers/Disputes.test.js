import { expectThrow } from 'kleros-interaction/helpers/utils'

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
      }, 200)
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

  describe('_updateStoreForDispute', async () => {
    it('updates store with timestamps. Not in session', async () => {
      const mockDispute = {
        arbitrableContractAddress: 'mockAddress',
        partyA: 'mockPartyA',
        partyB: 'mockPartyA',
        title: 'mockTitle',
        status: 1,
        appealCreatedAt: [],
        appealRuledAt: [],
        appealDeadlines: [],
        lastSession: 1,
        numberOfAppeals: 2
      }
      const mockGetDataForDispute = jest.fn()
      disputesInstance.getDataForDispute = mockGetDataForDispute.mockReturnValue(
        _asyncMockResponse(mockDispute)
      )

      const mockUpdateDispute = jest.fn()
      const mockGetDisputeData = jest.fn()
      const mockUpdateDisputeProfile = jest.fn()
      const mockStore = {
        updateDispute: mockUpdateDispute.mockReturnValue(
          _asyncMockResponse(mockDispute)
        ),
        getDisputeData: mockGetDisputeData.mockReturnValue(
          _asyncMockResponse({ appealDraws: [[3]] })
        ),
        updateDisputeProfile: mockUpdateDisputeProfile
      }
      disputesInstance.setStoreProvider(mockStore)

      disputesInstance._Arbitrator.getSession = jest
        .fn()
        .mockReturnValue(_asyncMockResponse(2))

      const mockGetDrawsForJuror = jest.fn()
      disputesInstance._Arbitrator.getDrawsForJuror = mockGetDrawsForJuror

      const params = [
        arbitratorAddress,
        0,
        account,
        11111111,
        22222222,
        3333333
      ]

      const dispute = await disputesInstance._updateStoreForDispute(...params)

      expect(dispute).toBeTruthy()
      expect(dispute).toEqual(mockDispute)
      expect(mockGetDataForDispute.mock.calls.length).toBe(1)

      expect(mockUpdateDispute.mock.calls.length).toBe(1)
      expect(
        mockUpdateDispute.mock.calls[0][2].appealCreatedAt[
          mockDispute.numberOfAppeals
        ]
      ).toBe(params[3])
      expect(
        mockUpdateDispute.mock.calls[0][2].appealRuledAt[
          mockDispute.numberOfAppeals
        ]
      ).toBe(params[4])
      expect(
        mockUpdateDispute.mock.calls[0][2].appealDeadlines[
          mockDispute.numberOfAppeals
        ]
      ).toBe(params[5])

      expect(mockGetDisputeData.mock.calls.length).toBe(1)

      expect(mockGetDrawsForJuror.mock.calls.length).toBe(0)

      expect(mockUpdateDisputeProfile.mock.calls.length).toBe(1)
      expect(mockUpdateDisputeProfile.mock.calls[0][3]).toEqual({
        appealDraws: [[3]]
      })
    })
    it('updates store with timestamps. In session', async () => {
      const mockDispute = {
        arbitrableContractAddress: 'mockAddress',
        partyA: 'mockPartyA',
        partyB: 'mockPartyA',
        title: 'mockTitle',
        status: 1,
        appealCreatedAt: [],
        appealRuledAt: [],
        appealDeadlines: [],
        lastSession: 1,
        numberOfAppeals: 0
      }
      const mockGetDataForDispute = jest.fn()
      disputesInstance.getDataForDispute = mockGetDataForDispute.mockReturnValue(
        _asyncMockResponse(mockDispute)
      )

      const mockUpdateDispute = jest.fn()
      const mockGetDisputeData = jest.fn()
      const mockUpdateDisputeProfile = jest.fn()
      const mockStore = {
        updateDispute: mockUpdateDispute.mockReturnValue(
          _asyncMockResponse(mockDispute)
        ),
        getDisputeData: mockGetDisputeData.mockReturnValue(
          _asyncMockResponse({})
        ),
        updateDisputeProfile: mockUpdateDisputeProfile
      }
      disputesInstance.setStoreProvider(mockStore)

      disputesInstance._Arbitrator.getSession = jest
        .fn()
        .mockReturnValue(_asyncMockResponse(1))

      const mockGetDrawsForJuror = jest.fn()
      disputesInstance._Arbitrator.getDrawsForJuror = mockGetDrawsForJuror.mockReturnValue(
        _asyncMockResponse([3])
      )

      const params = [
        arbitratorAddress,
        0,
        account,
        11111111,
        22222222,
        3333333
      ]

      const dispute = await disputesInstance._updateStoreForDispute(...params)

      expect(dispute).toBeTruthy()
      expect(dispute).toEqual(mockDispute)
      expect(mockGetDataForDispute.mock.calls.length).toBe(1)

      expect(mockUpdateDispute.mock.calls.length).toBe(1)
      expect(
        mockUpdateDispute.mock.calls[0][2].appealCreatedAt[
          mockDispute.numberOfAppeals
        ]
      ).toBe(params[3])
      expect(
        mockUpdateDispute.mock.calls[0][2].appealRuledAt[
          mockDispute.numberOfAppeals
        ]
      ).toBe(params[4])
      expect(
        mockUpdateDispute.mock.calls[0][2].appealDeadlines[
          mockDispute.numberOfAppeals
        ]
      ).toBe(params[5])

      expect(mockGetDisputeData.mock.calls.length).toBe(1)

      expect(mockGetDrawsForJuror.mock.calls.length).toBe(1)

      expect(mockUpdateDisputeProfile.mock.calls.length).toBe(1)
      expect(mockUpdateDisputeProfile.mock.calls[0][3]).toEqual({
        appealDraws: [[3]]
      })
    })
  })

  describe('getUserDisputeFromStore', async () => {
    it('fetches dispute', async () => {
      const mockGetUserProfile = jest.fn()
      const mockDispute = {
        arbitratorAddress,
        disputeId: 0
      }
      const mockStoreProvider = {
        getUserProfile: mockGetUserProfile.mockReturnValue(
          _asyncMockResponse({
            disputes: [mockDispute]
          })
        )
      }

      disputesInstance.setStoreProvider(mockStoreProvider)

      const dispute = await disputesInstance.getUserDisputeFromStore(
        mockDispute.arbitratorAddress,
        mockDispute.disputeId,
        account
      )

      expect(dispute).toBeTruthy()
      expect(dispute).toEqual(mockDispute)
    })
    it('cannot fetch dispute', async () => {
      const mockGetUserProfile = jest.fn()
      const mockDispute = {
        arbitratorAddress,
        disputeId: 0
      }
      const mockStoreProvider = {
        getUserProfile: mockGetUserProfile.mockReturnValue(
          _asyncMockResponse({
            disputes: [mockDispute]
          })
        )
      }

      disputesInstance.setStoreProvider(mockStoreProvider)

      expectThrow(
        disputesInstance.getUserDisputeFromStore(
          mockDispute.arbitratorAddress,
          mockDispute.disputeId + 1,
          account
        )
      )
    })
  })

  describe('getEvidenceForArbitrableContract', async () => {
    it('combines evidence from both parties', async () => {
      const partyA = '0x0'
      const partyB = '0x1'
      const arbitrableContractAddress = '0xfakeaddress'
      const mockData = {
        partyA,
        partyB
      }
      const mockGetData = jest.fn()
      disputesInstance._ArbitrableContract.getData = mockGetData.mockReturnValue(
        _asyncMockResponse(mockData)
      )

      const mockGetContractByAddress = jest.fn()
      // return partyA then partyB contract
      mockGetContractByAddress.mockReturnValueOnce({
        evidences: [
          {
            name: 'testPartyA'
          }
        ]
      })
      mockGetContractByAddress.mockReturnValueOnce({
        evidences: [
          {
            name: 'testPartyB'
          }
        ]
      })

      const mockStore = {
        getContractByAddress: mockGetContractByAddress
      }

      disputesInstance.setStoreProvider(mockStore)

      const evidence = await disputesInstance.getEvidenceForArbitrableContract(
        arbitrableContractAddress
      )

      expect(evidence).toBeTruthy()
      expect(evidence.length).toBe(2)
      expect(evidence[0].submitter).toEqual(partyA)
    })
    it('still fetches evidence when one party has none', async () => {
      const partyA = '0x0'
      const partyB = '0x1'
      const arbitrableContractAddress = '0xfakeaddress'
      const mockData = {
        partyA,
        partyB
      }
      const mockGetData = jest.fn()
      disputesInstance._ArbitrableContract.getData = mockGetData.mockReturnValue(
        _asyncMockResponse(mockData)
      )

      const mockGetContractByAddress = jest.fn()
      // return partyA then partyB contract
      mockGetContractByAddress.mockReturnValueOnce({
        evidences: [
          {
            name: 'testPartyA'
          }
        ]
      })
      mockGetContractByAddress.mockReturnValueOnce(null)

      const mockStore = {
        getContractByAddress: mockGetContractByAddress
      }

      disputesInstance.setStoreProvider(mockStore)

      const evidence = await disputesInstance.getEvidenceForArbitrableContract(
        arbitrableContractAddress
      )

      expect(evidence).toBeTruthy()
      expect(evidence.length).toBe(1)
      expect(evidence[0].submitter).toEqual(partyA)
    })
  })

  describe('getDataForDispute', async () => {
    it('gets data for new dispute (no store data)', async () => {
      const disputeId = 0
      const arbitrableContractAddress = '0xfakeaddress'
      const session = 1
      const period = 0
      const numberOfAppeals = 0
      const rulingChoices = [0, 1]
      const initialNumberJurors = 3
      const arbitrationFeePerJuror = 0.15
      const voteCounters = []
      const partyA = '0x0'
      const partyB = '0x1'

      const mockArbitratorGetDispute = jest.fn().mockReturnValue(
        _asyncMockResponse({
          arbitratorAddress,
          disputeId,
          arbitrableContractAddress,
          firstSession: session,
          numberOfAppeals,
          rulingChoices,
          initialNumberJurors,
          arbitrationFeePerJuror,
          state: 0,
          voteCounters,
          status: 0
        })
      )
      const mockArbitrator = {
        getDispute: mockArbitratorGetDispute,
        getPeriod: jest.fn().mockReturnValue(period),
        getSession: jest.fn().mockReturnValue(session),
        currentRulingForDispute: jest.fn().mockReturnValue(0),
        canRuleDispute: jest.fn().mockReturnValue(false)
      }
      disputesInstance._Arbitrator = mockArbitrator

      const mockArbitrableContractData = {
        partyA,
        partyB,
        status: 0
      }
      const mockArbitrableContract = {
        getData: jest.fn().mockReturnValue(mockArbitrableContractData)
      }
      disputesInstance._ArbitrableContract = mockArbitrableContract

      disputesInstance.getEvidenceForArbitrableContract = jest
        .fn()
        .mockReturnValue([])

      const mockContract = {
        description: 'testdesc',
        email: 'testemail@test.com'
      }
      const mockStoreProvider = {
        getContractByAddress: jest.fn().mockReturnValue(mockContract)
      }
      disputesInstance.setStoreProvider(mockStoreProvider)

      const disputeData = await disputesInstance.getDataForDispute(
        arbitratorAddress,
        disputeId,
        account
      )

      expect(disputeData).toBeTruthy()
      expect(disputeData.arbitrableContractAddress).toEqual(
        arbitrableContractAddress
      )
      expect(disputeData.arbitrableContractStatus).toEqual(0)
      expect(disputeData.arbitratorAddress).toEqual(arbitratorAddress)
      expect(disputeData.partyA).toEqual(partyA)
      expect(disputeData.partyB).toEqual(partyB)
      expect(disputeData.disputeId).toEqual(disputeId)
      expect(disputeData.firstSession).toEqual(session)
      expect(disputeData.lastSession).toEqual(session)
      expect(disputeData.numberOfAppeals).toEqual(numberOfAppeals)
      expect(disputeData.disputeState).toEqual(0)
      expect(disputeData.disputeStatus).toEqual(0)
      expect(disputeData.appealJuror.length).toBe(1)
      expect(disputeData.appealRulings.length).toBe(1)
      expect(disputeData.description).toEqual(mockContract.description)
      expect(disputeData.email).toEqual(mockContract.email)
      expect(disputeData.evidence).toEqual([])
      expect(disputeData.netPNK).toEqual(0)
    })
    it('gets data active dispute', async () => {
      const disputeId = 0
      const arbitrableContractAddress = '0xfakeaddress'
      const session = 1
      const period = 3
      const numberOfAppeals = 0
      const rulingChoices = [0, 1]
      const initialNumberJurors = 3
      const arbitrationFeePerJuror = 0.15
      const voteCounters = [[2, 4]]
      const partyA = '0x0'
      const partyB = '0x1'

      const mockArbitratorGetDispute = jest.fn().mockReturnValue(
        _asyncMockResponse({
          arbitratorAddress,
          disputeId,
          arbitrableContractAddress,
          firstSession: session,
          numberOfAppeals,
          rulingChoices,
          initialNumberJurors,
          arbitrationFeePerJuror,
          state: 0,
          voteCounters,
          status: 0
        })
      )
      const mockArbitrator = {
        getDispute: mockArbitratorGetDispute,
        getPeriod: jest.fn().mockReturnValue(period),
        getSession: jest.fn().mockReturnValue(session),
        currentRulingForDispute: jest.fn().mockReturnValue(2),
        canRuleDispute: jest.fn().mockReturnValue(true)
      }
      disputesInstance._Arbitrator = mockArbitrator

      const mockArbitrableContractData = {
        partyA,
        partyB,
        status: 0
      }
      const mockArbitrableContract = {
        getData: jest.fn().mockReturnValue(mockArbitrableContractData)
      }
      disputesInstance._ArbitrableContract = mockArbitrableContract

      disputesInstance.getEvidenceForArbitrableContract = jest
        .fn()
        .mockReturnValue([])

      const mockContract = {
        description: 'testdesc',
        email: 'testemail@test.com'
      }
      const mockUserData = {
        appealDraws: [[1, 2]],
        appealCreatedAt: [123],
        appealDeadlines: [456],
        appealRuledAt: [],
        netPNK: 0
      }
      const mockStoreProvider = {
        getContractByAddress: jest.fn().mockReturnValue(mockContract),
        getDisputeData: jest.fn().mockReturnValue(mockUserData)
      }
      disputesInstance.setStoreProvider(mockStoreProvider)

      const disputeData = await disputesInstance.getDataForDispute(
        arbitratorAddress,
        disputeId,
        account
      )

      expect(disputeData).toBeTruthy()
      expect(disputeData.arbitrableContractAddress).toEqual(
        arbitrableContractAddress
      )
      expect(disputeData.arbitrableContractStatus).toEqual(0)
      expect(disputeData.arbitratorAddress).toEqual(arbitratorAddress)
      expect(disputeData.partyA).toEqual(partyA)
      expect(disputeData.partyB).toEqual(partyB)
      expect(disputeData.disputeId).toEqual(disputeId)
      expect(disputeData.firstSession).toEqual(session)
      expect(disputeData.lastSession).toEqual(session)
      expect(disputeData.numberOfAppeals).toEqual(numberOfAppeals)
      expect(disputeData.disputeState).toEqual(0)
      expect(disputeData.disputeStatus).toEqual(0)

      expect(disputeData.appealJuror.length).toBe(1)
      const jurorData = disputeData.appealJuror[0]
      expect(jurorData.createdAt).toEqual(
        mockUserData.appealCreatedAt[numberOfAppeals]
      )
      expect(jurorData.fee).toEqual(
        arbitrationFeePerJuror *
          mockUserData.appealDraws[numberOfAppeals].length
      )
      expect(jurorData.draws).toEqual(mockUserData.appealDraws[numberOfAppeals])
      expect(jurorData.canRule).toBeTruthy()

      expect(disputeData.appealRulings.length).toBe(1)
      const appealData = disputeData.appealRulings[0]
      expect(appealData.voteCounter).toEqual(voteCounters[numberOfAppeals])
      expect(appealData.deadline).toEqual(
        mockUserData.appealDeadlines[numberOfAppeals]
      )
      expect(appealData.ruledAt).toBeFalsy()
      expect(appealData.ruling).toEqual(2)
      expect(appealData.canRepartition).toBeFalsy()
      expect(appealData.canExecute).toBeFalsy()

      expect(disputeData.description).toEqual(mockContract.description)
      expect(disputeData.email).toEqual(mockContract.email)
      expect(disputeData.evidence).toEqual([])
      expect(disputeData.netPNK).toEqual(0)
    })
    it('gets data ruled on dispute -- can repartition', async () => {
      const disputeId = 0
      const arbitrableContractAddress = '0xfakeaddress'
      const session = 1
      const period = 4
      const numberOfAppeals = 0
      const rulingChoices = [0, 1]
      const initialNumberJurors = 3
      const arbitrationFeePerJuror = 0.15
      const voteCounters = [[4, 5]]
      const partyA = '0x0'
      const partyB = '0x1'

      const mockArbitratorGetDispute = jest.fn().mockReturnValue(
        _asyncMockResponse({
          arbitratorAddress,
          disputeId,
          arbitrableContractAddress,
          firstSession: session,
          numberOfAppeals,
          rulingChoices,
          initialNumberJurors,
          arbitrationFeePerJuror,
          state: 0,
          voteCounters,
          status: 3
        })
      )
      const mockArbitrator = {
        getDispute: mockArbitratorGetDispute,
        getPeriod: jest.fn().mockReturnValue(period),
        getSession: jest.fn().mockReturnValue(session),
        currentRulingForDispute: jest.fn().mockReturnValue(2),
        canRuleDispute: jest.fn().mockReturnValue(false)
      }
      disputesInstance._Arbitrator = mockArbitrator

      const mockArbitrableContractData = {
        partyA,
        partyB,
        status: 3
      }
      const mockArbitrableContract = {
        getData: jest.fn().mockReturnValue(mockArbitrableContractData)
      }
      disputesInstance._ArbitrableContract = mockArbitrableContract

      disputesInstance.getEvidenceForArbitrableContract = jest
        .fn()
        .mockReturnValue([])

      const mockContract = {
        description: 'testdesc',
        email: 'testemail@test.com'
      }
      const mockUserData = {
        appealDraws: [[1, 2]],
        appealCreatedAt: [123],
        appealDeadlines: [456],
        appealRuledAt: [789],
        netPNK: 2
      }
      const mockStoreProvider = {
        getContractByAddress: jest.fn().mockReturnValue(mockContract),
        getDisputeData: jest.fn().mockReturnValue(mockUserData)
      }
      disputesInstance.setStoreProvider(mockStoreProvider)

      const disputeData = await disputesInstance.getDataForDispute(
        arbitratorAddress,
        disputeId,
        account
      )

      expect(disputeData).toBeTruthy()
      expect(disputeData.arbitrableContractAddress).toEqual(
        arbitrableContractAddress
      )
      expect(disputeData.arbitrableContractStatus).toEqual(3)
      expect(disputeData.arbitratorAddress).toEqual(arbitratorAddress)
      expect(disputeData.partyA).toEqual(partyA)
      expect(disputeData.partyB).toEqual(partyB)
      expect(disputeData.disputeId).toEqual(disputeId)
      expect(disputeData.firstSession).toEqual(session)
      expect(disputeData.lastSession).toEqual(session)
      expect(disputeData.numberOfAppeals).toEqual(numberOfAppeals)
      expect(disputeData.disputeState).toEqual(0)
      expect(disputeData.disputeStatus).toEqual(3)

      expect(disputeData.appealJuror.length).toBe(1)
      const jurorData = disputeData.appealJuror[0]
      expect(jurorData.createdAt).toEqual(
        mockUserData.appealCreatedAt[numberOfAppeals]
      )
      expect(jurorData.fee).toEqual(
        arbitrationFeePerJuror *
          mockUserData.appealDraws[numberOfAppeals].length
      )
      expect(jurorData.draws).toEqual(mockUserData.appealDraws[numberOfAppeals])
      expect(jurorData.canRule).toBeFalsy()

      expect(disputeData.appealRulings.length).toBe(1)
      const appealData = disputeData.appealRulings[0]
      expect(appealData.voteCounter).toEqual(voteCounters[numberOfAppeals])
      expect(appealData.deadline).toEqual(
        mockUserData.appealDeadlines[numberOfAppeals]
      )
      expect(appealData.ruledAt).toEqual(
        mockUserData.appealRuledAt[numberOfAppeals]
      )
      expect(appealData.ruling).toEqual(2)
      expect(appealData.canRepartition).toBeTruthy()
      expect(appealData.canExecute).toBeFalsy()

      expect(disputeData.description).toEqual(mockContract.description)
      expect(disputeData.email).toEqual(mockContract.email)
      expect(disputeData.evidence).toEqual([])
      expect(disputeData.netPNK).toEqual(2)
    })
    it('gets data ruled on dispute -- can execute', async () => {
      const disputeId = 0
      const arbitrableContractAddress = '0xfakeaddress'
      const session = 1
      const period = 4
      const numberOfAppeals = 0
      const rulingChoices = [0, 1]
      const initialNumberJurors = 3
      const arbitrationFeePerJuror = 0.15
      const voteCounters = [[4, 5]]
      const partyA = '0x0'
      const partyB = '0x1'

      const mockArbitratorGetDispute = jest.fn().mockReturnValue(
        _asyncMockResponse({
          arbitratorAddress,
          disputeId,
          arbitrableContractAddress,
          firstSession: session,
          numberOfAppeals,
          rulingChoices,
          initialNumberJurors,
          arbitrationFeePerJuror,
          state: 2,
          voteCounters,
          status: 3
        })
      )
      const mockArbitrator = {
        getDispute: mockArbitratorGetDispute,
        getPeriod: jest.fn().mockReturnValue(period),
        getSession: jest.fn().mockReturnValue(session),
        currentRulingForDispute: jest.fn().mockReturnValue(2),
        canRuleDispute: jest.fn().mockReturnValue(false)
      }
      disputesInstance._Arbitrator = mockArbitrator

      const mockArbitrableContractData = {
        partyA,
        partyB,
        status: 3
      }
      const mockArbitrableContract = {
        getData: jest.fn().mockReturnValue(mockArbitrableContractData)
      }
      disputesInstance._ArbitrableContract = mockArbitrableContract

      disputesInstance.getEvidenceForArbitrableContract = jest
        .fn()
        .mockReturnValue([])

      const mockContract = {
        description: 'testdesc',
        email: 'testemail@test.com'
      }
      const mockUserData = {
        appealDraws: [[1, 2]],
        appealCreatedAt: [123],
        appealDeadlines: [456],
        appealRuledAt: [789],
        netPNK: 2
      }
      const mockStoreProvider = {
        getContractByAddress: jest.fn().mockReturnValue(mockContract),
        getDisputeData: jest.fn().mockReturnValue(mockUserData)
      }
      disputesInstance.setStoreProvider(mockStoreProvider)

      const disputeData = await disputesInstance.getDataForDispute(
        arbitratorAddress,
        disputeId,
        account
      )

      expect(disputeData).toBeTruthy()
      expect(disputeData.arbitrableContractAddress).toEqual(
        arbitrableContractAddress
      )
      expect(disputeData.arbitrableContractStatus).toEqual(3)
      expect(disputeData.arbitratorAddress).toEqual(arbitratorAddress)
      expect(disputeData.partyA).toEqual(partyA)
      expect(disputeData.partyB).toEqual(partyB)
      expect(disputeData.disputeId).toEqual(disputeId)
      expect(disputeData.firstSession).toEqual(session)
      expect(disputeData.lastSession).toEqual(session)
      expect(disputeData.numberOfAppeals).toEqual(numberOfAppeals)
      expect(disputeData.disputeState).toEqual(2)
      expect(disputeData.disputeStatus).toEqual(3)

      expect(disputeData.appealJuror.length).toBe(1)
      const jurorData = disputeData.appealJuror[0]
      expect(jurorData.createdAt).toEqual(
        mockUserData.appealCreatedAt[numberOfAppeals]
      )
      expect(jurorData.fee).toEqual(
        arbitrationFeePerJuror *
          mockUserData.appealDraws[numberOfAppeals].length
      )
      expect(jurorData.draws).toEqual(mockUserData.appealDraws[numberOfAppeals])
      expect(jurorData.canRule).toBeFalsy()

      expect(disputeData.appealRulings.length).toBe(1)
      const appealData = disputeData.appealRulings[0]
      expect(appealData.voteCounter).toEqual(voteCounters[numberOfAppeals])
      expect(appealData.deadline).toEqual(
        mockUserData.appealDeadlines[numberOfAppeals]
      )
      expect(appealData.ruledAt).toEqual(
        mockUserData.appealRuledAt[numberOfAppeals]
      )
      expect(appealData.ruling).toEqual(2)
      expect(appealData.canRepartition).toBeFalsy()
      expect(appealData.canExecute).toBeTruthy()

      expect(disputeData.description).toEqual(mockContract.description)
      expect(disputeData.email).toEqual(mockContract.email)
      expect(disputeData.evidence).toEqual([])
      expect(disputeData.netPNK).toEqual(2)
    })
  })
})
