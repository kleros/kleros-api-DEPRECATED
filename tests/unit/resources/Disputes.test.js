import DisputesApi from '../../../src/resources/Disputes'
import _asyncMockResponse from '../../helpers/asyncMockResponse'

describe('Disputes', () => {
  let mockArbitratorWrapper = {}
  let mockArbitrableContractWrapper = {}
  let arbitratorAddress = '0xDcB2db3E3fA7a6cba5dFE964408099d860246D7Z'
  let arbitrableConctractAddress = '0xEcB2db3E3fA7a6cba5dFE964408099d860246D7Z'
  let account = '0x'
  let disputesInstance

  beforeEach(async () => {
    disputesInstance = new DisputesApi(
      mockArbitratorWrapper,
      mockArbitrableContractWrapper,
      {},
      {}
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

  describe('getDataForDispute', async () => {
    it('gets data for new dispute (no store data)', async () => {
      const disputeID = 0
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
      const appealDeadlines = 1
      const appealRuledAt = 2
      const appealCreatedAt = 3

      const mockArbitratorGetDispute = jest.fn().mockReturnValue(
        _asyncMockResponse({
          arbitratorAddress,
          disputeID,
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
        getVoteForJuror: jest.fn().mockReturnValue([0, 1]),
        getDispute: mockArbitratorGetDispute,
        getPeriod: jest.fn().mockReturnValue(period),
        getSession: jest.fn().mockReturnValue(session),
        currentRulingForDispute: jest.fn().mockReturnValue(0),
        canRuleDispute: jest.fn().mockReturnValue(false),
        getContractAddress: jest.fn().mockReturnValue(arbitratorAddress),
        getDisputeCreationEvent: jest.fn().mockReturnValue({ blockNumber: 1 }),
        getNetTokensForDispute: jest.fn().mockReturnValue(0),
        getAppealRuledAtTimestamp: jest.fn().mockReturnValue(appealRuledAt),
        getDisputeDeadlineTimestamp: jest.fn().mockReturnValue(appealDeadlines),
        getAppealCreationTimestamp: jest.fn().mockReturnValue(appealCreatedAt),
        _getTimestampForBlock: jest.fn().mockReturnValue(appealCreatedAt / 1000)
      }
      disputesInstance._ArbitratorInstance = mockArbitrator

      const mockArbitrableContractData = {
        metaEvidence: {
          title: 'test'
        }
      }
      const mockArbitrableContract = {
        getParties: jest.fn().mockReturnValue({ partyA, partyB }),
        getMetaEvidence: jest
          .fn()
          .mockReturnValue(mockArbitrableContractData.metaEvidence),
        getEvidence: jest.fn().mockReturnValue([]),
        setContractInstance: jest.fn()
      }
      disputesInstance._ArbitrableInstance = mockArbitrableContract

      const mockContract = {
        description: 'testdesc',
        email: 'testemail@test.com'
      }
      const mockStoreProvider = {
        getContractByAddress: jest.fn().mockReturnValue(mockContract)
      }
      disputesInstance.setStoreProviderInstance(mockStoreProvider)

      const disputeData = await disputesInstance.getDataForDispute(
        disputeID,
        account
      )

      expect(disputeData).toBeTruthy()
      expect(disputeData.arbitrableContractAddress).toEqual(
        arbitrableContractAddress
      )
      expect(disputeData.arbitratorAddress).toEqual(arbitratorAddress)
      expect(disputeData.parties.partyA).toEqual(partyA)
      expect(disputeData.parties.partyB).toEqual(partyB)
      expect(disputeData.disputeID).toEqual(disputeID)
      expect(disputeData.firstSession).toEqual(session)
      expect(disputeData.lastSession).toEqual(session)
      expect(disputeData.numberOfAppeals).toEqual(numberOfAppeals)
      expect(disputeData.disputeState).toEqual(0)
      expect(disputeData.disputeStatus).toEqual(0)
      expect(disputeData.appealJuror.length).toBe(1)
      expect(disputeData.appealRulings.length).toBe(1)
      expect(disputeData.evidence).toEqual([])
      expect(disputeData.netPNK).toEqual(0)
      expect(disputeData.metaEvidence).toEqual(
        mockArbitrableContractData.metaEvidence
      )
    })
    it('gets data active dispute', async () => {
      const disputeID = 0
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
      const appealDeadlines = 1
      const appealRuledAt = null
      const appealCreatedAt = 3

      const mockArbitratorGetDispute = jest.fn().mockReturnValue(
        _asyncMockResponse({
          arbitratorAddress,
          disputeID,
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
        getVoteForJuror: jest.fn().mockReturnValue([0, 1]),
        getDispute: mockArbitratorGetDispute,
        getPeriod: jest.fn().mockReturnValue(period),
        getSession: jest.fn().mockReturnValue(session),
        currentRulingForDispute: jest.fn().mockReturnValue(2),
        canRuleDispute: jest.fn().mockReturnValue(true),
        getContractAddress: jest.fn().mockReturnValue(arbitratorAddress),
        getDisputeCreationEvent: jest.fn().mockReturnValue({ blockNumber: 1 }),
        getNetTokensForDispute: jest.fn().mockReturnValue(0),
        getAppealRuledAtTimestamp: jest.fn().mockReturnValue(appealRuledAt),
        getDisputeDeadlineTimestamp: jest.fn().mockReturnValue(appealDeadlines),
        getAppealCreationTimestamp: jest.fn().mockReturnValue(appealCreatedAt),
        _getTimestampForBlock: jest.fn().mockReturnValue(appealCreatedAt / 1000)
      }
      disputesInstance._ArbitratorInstance = mockArbitrator

      const mockArbitrableContractData = {
        metaEvidence: {
          title: 'test'
        }
      }
      const mockArbitrableContract = {
        getParties: jest.fn().mockReturnValue({ partyA, partyB }),
        getMetaEvidence: jest
          .fn()
          .mockReturnValue(mockArbitrableContractData.metaEvidence),
        getEvidence: jest.fn().mockReturnValue([]),
        setContractInstance: jest.fn()
      }
      disputesInstance._ArbitrableInstance = mockArbitrableContract

      const mockContract = {
        description: 'testdesc',
        email: 'testemail@test.com'
      }
      const mockUserData = {
        appealDraws: [[1, 2]]
      }
      const mockStoreProvider = {
        getContractByAddress: jest.fn().mockReturnValue(mockContract),
        getDispute: jest.fn().mockReturnValue(mockUserData)
      }
      disputesInstance.setStoreProviderInstance(mockStoreProvider)

      const disputeData = await disputesInstance.getDataForDispute(
        disputeID,
        account
      )

      expect(disputeData).toBeTruthy()
      expect(disputeData.arbitrableContractAddress).toEqual(
        arbitrableContractAddress
      )
      expect(disputeData.arbitratorAddress).toEqual(arbitratorAddress)
      expect(disputeData.parties.partyA).toEqual(partyA)
      expect(disputeData.parties.partyB).toEqual(partyB)
      expect(disputeData.disputeID).toEqual(disputeID)
      expect(disputeData.firstSession).toEqual(session)
      expect(disputeData.lastSession).toEqual(session)
      expect(disputeData.numberOfAppeals).toEqual(numberOfAppeals)
      expect(disputeData.disputeState).toEqual(0)
      expect(disputeData.disputeStatus).toEqual(0)

      expect(disputeData.appealJuror.length).toBe(1)
      const jurorData = disputeData.appealJuror[0]
      expect(jurorData.fee).toEqual(
        arbitrationFeePerJuror *
          mockUserData.appealDraws[numberOfAppeals].length
      )
      expect(jurorData.draws).toEqual(mockUserData.appealDraws[numberOfAppeals])
      expect(jurorData.canRule).toBeTruthy()

      expect(disputeData.appealRulings.length).toBe(1)
      const appealData = disputeData.appealRulings[0]
      expect(appealData.voteCounter).toEqual(voteCounters[numberOfAppeals])
      expect(appealData.ruledAt).toBeFalsy()
      expect(appealData.deadline).toEqual(appealDeadlines)
      expect(appealData.ruling).toEqual(2)
      expect(appealData.canRepartition).toBeFalsy()
      expect(appealData.canExecute).toBeFalsy()

      expect(disputeData.evidence).toEqual([])
      expect(disputeData.netPNK).toEqual(0)
      expect(disputeData.metaEvidence).toEqual(
        mockArbitrableContractData.metaEvidence
      )
    })
    it('gets data ruled on dispute -- can repartition', async () => {
      const disputeID = 0
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
      const appealDeadlines = 1
      const appealRuledAt = 2
      const appealCreatedAt = 3

      const mockArbitratorGetDispute = jest.fn().mockReturnValue(
        _asyncMockResponse({
          arbitratorAddress,
          disputeID,
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
        getVoteForJuror: jest.fn().mockReturnValue([0, 1]),
        getDispute: mockArbitratorGetDispute,
        getPeriod: jest.fn().mockReturnValue(period),
        getSession: jest.fn().mockReturnValue(session),
        currentRulingForDispute: jest.fn().mockReturnValue(2),
        canRuleDispute: jest.fn().mockReturnValue(false),
        getContractAddress: jest.fn().mockReturnValue(arbitratorAddress),
        getDisputeCreationEvent: jest.fn().mockReturnValue({ blockNumber: 1 }),
        getNetTokensForDispute: jest.fn().mockReturnValue(0),
        getAppealRuledAtTimestamp: jest.fn().mockReturnValue(appealRuledAt),
        getDisputeDeadlineTimestamp: jest.fn().mockReturnValue(appealDeadlines),
        getAppealCreationTimestamp: jest.fn().mockReturnValue(appealCreatedAt),
        _getTimestampForBlock: jest.fn().mockReturnValue(appealCreatedAt / 1000)
      }
      disputesInstance._ArbitratorInstance = mockArbitrator

      const mockArbitrableContractData = {
        metaEvidence: {
          title: 'test'
        }
      }
      const mockArbitrableContract = {
        getParties: jest.fn().mockReturnValue({ partyA, partyB }),
        getMetaEvidence: jest
          .fn()
          .mockReturnValue(mockArbitrableContractData.metaEvidence),
        getEvidence: jest.fn().mockReturnValue([]),
        setContractInstance: jest.fn()
      }
      disputesInstance._ArbitrableInstance = mockArbitrableContract

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
        getDispute: jest.fn().mockReturnValue(mockUserData)
      }
      disputesInstance.setStoreProviderInstance(mockStoreProvider)

      const disputeData = await disputesInstance.getDataForDispute(
        disputeID,
        account
      )

      expect(disputeData).toBeTruthy()
      expect(disputeData.arbitrableContractAddress).toEqual(
        arbitrableContractAddress
      )
      expect(disputeData.arbitratorAddress).toEqual(arbitratorAddress)
      expect(disputeData.parties.partyA).toEqual(partyA)
      expect(disputeData.parties.partyB).toEqual(partyB)
      expect(disputeData.disputeID).toEqual(disputeID)
      expect(disputeData.firstSession).toEqual(session)
      expect(disputeData.lastSession).toEqual(session)
      expect(disputeData.numberOfAppeals).toEqual(numberOfAppeals)
      expect(disputeData.disputeState).toEqual(0)
      expect(disputeData.disputeStatus).toEqual(3)

      expect(disputeData.appealJuror.length).toBe(1)
      const jurorData = disputeData.appealJuror[0]
      expect(jurorData.fee).toEqual(
        arbitrationFeePerJuror *
          mockUserData.appealDraws[numberOfAppeals].length
      )
      expect(jurorData.draws).toEqual(mockUserData.appealDraws[numberOfAppeals])
      expect(jurorData.canRule).toBeFalsy()

      expect(disputeData.appealRulings.length).toBe(1)
      const appealData = disputeData.appealRulings[0]
      expect(appealData.voteCounter).toEqual(voteCounters[numberOfAppeals])
      expect(appealData.ruling).toEqual(2)
      expect(appealData.canRepartition).toBeTruthy()
      expect(appealData.canExecute).toBeFalsy()
      expect(disputeData.evidence).toEqual([])
    })
    it('gets data ruled on dispute -- can execute', async () => {
      const disputeID = 0
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
      const appealDeadlines = 1
      const appealRuledAt = 2
      const appealCreatedAt = 3

      const mockArbitratorGetDispute = jest.fn().mockReturnValue(
        _asyncMockResponse({
          arbitratorAddress,
          disputeID,
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
        getVoteForJuror: jest.fn().mockReturnValue([0, 1]),
        getDispute: mockArbitratorGetDispute,
        getPeriod: jest.fn().mockReturnValue(period),
        getSession: jest.fn().mockReturnValue(session),
        currentRulingForDispute: jest.fn().mockReturnValue(2),
        canRuleDispute: jest.fn().mockReturnValue(false),
        getContractAddress: jest.fn().mockReturnValue(arbitratorAddress),
        getDisputeCreationEvent: jest.fn().mockReturnValue({ blockNumber: 1 }),
        getNetTokensForDispute: jest.fn().mockReturnValue(0),
        getAppealRuledAtTimestamp: jest.fn().mockReturnValue(appealRuledAt),
        getDisputeDeadlineTimestamp: jest.fn().mockReturnValue(appealDeadlines),
        getAppealCreationTimestamp: jest.fn().mockReturnValue(appealCreatedAt),
        _getTimestampForBlock: jest.fn().mockReturnValue(appealCreatedAt / 1000)
      }
      disputesInstance._ArbitratorInstance = mockArbitrator

      const mockArbitrableContractData = {
        metaEvidence: {
          title: 'test'
        }
      }
      const mockArbitrableContract = {
        getParties: jest.fn().mockReturnValue({ partyA, partyB }),
        getMetaEvidence: jest
          .fn()
          .mockReturnValue(mockArbitrableContractData.metaEvidence),
        getEvidence: jest.fn().mockReturnValue([]),
        setContractInstance: jest.fn()
      }
      disputesInstance._ArbitrableInstance = mockArbitrableContract

      const mockContract = {
        description: 'testdesc',
        email: 'testemail@test.com'
      }
      const mockUserData = {
        appealDraws: [[1, 2]],
        appealCreatedAt: [123],
        appealDeadlines: [456],
        appealRuledAt: [789],
        lastBlock: 1
      }
      const mockStoreProvider = {
        getContractByAddress: jest.fn().mockReturnValue(mockContract),
        getDispute: jest.fn().mockReturnValue(mockUserData)
      }
      disputesInstance.setStoreProviderInstance(mockStoreProvider)

      const disputeData = await disputesInstance.getDataForDispute(
        disputeID,
        account
      )

      expect(disputeData).toBeTruthy()
      expect(disputeData.arbitrableContractAddress).toEqual(
        arbitrableContractAddress
      )
      expect(disputeData.arbitratorAddress).toEqual(arbitratorAddress)
      expect(disputeData.disputeID).toEqual(disputeID)
      expect(disputeData.firstSession).toEqual(session)
      expect(disputeData.lastSession).toEqual(session)
      expect(disputeData.numberOfAppeals).toEqual(numberOfAppeals)
      expect(disputeData.disputeState).toEqual(2)
      expect(disputeData.disputeStatus).toEqual(3)

      expect(disputeData.appealJuror.length).toBe(1)
      const jurorData = disputeData.appealJuror[0]
      expect(jurorData.fee).toEqual(
        arbitrationFeePerJuror *
          mockUserData.appealDraws[numberOfAppeals].length
      )
      expect(jurorData.draws).toEqual(mockUserData.appealDraws[numberOfAppeals])
      expect(jurorData.canRule).toBeFalsy()

      expect(disputeData.appealRulings.length).toBe(1)
      const appealData = disputeData.appealRulings[0]
      expect(appealData.voteCounter).toEqual(voteCounters[numberOfAppeals])
      expect(appealData.ruling).toEqual(2)
      expect(appealData.canRepartition).toBeFalsy()
      expect(appealData.canExecute).toBeTruthy()
      expect(disputeData.evidence).toEqual([])
      expect(disputeData.metaEvidence).toEqual(
        mockArbitrableContractData.metaEvidence
      )
    })
  })
})
