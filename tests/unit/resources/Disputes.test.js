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
        canRuleDispute: jest.fn().mockReturnValue(false),
        getContractAddress: jest.fn().mockReturnValue(arbitratorAddress)
      }
      disputesInstance._ArbitratorInstance = mockArbitrator

      const mockArbitrableContractData = {
        partyA,
        partyB,
        status: 0
      }
      const mockArbitrableContract = {
        getData: jest.fn().mockReturnValue(mockArbitrableContractData),
        getEvidenceForArbitrableContract: jest.fn().mockReturnValue([]),
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
        canRuleDispute: jest.fn().mockReturnValue(true),
        getContractAddress: jest.fn().mockReturnValue(arbitratorAddress)
      }
      disputesInstance._ArbitratorInstance = mockArbitrator

      const mockArbitrableContractData = {
        partyA,
        partyB,
        status: 0
      }
      const mockArbitrableContract = {
        getData: jest.fn().mockReturnValue(mockArbitrableContractData),
        getEvidenceForArbitrableContract: jest.fn().mockReturnValue([]),
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
        appealRuledAt: [],
        netPNK: 0
      }
      const mockStoreProvider = {
        getContractByAddress: jest.fn().mockReturnValue(mockContract),
        getDisputeDataForUser: jest.fn().mockReturnValue(mockUserData)
      }
      disputesInstance.setStoreProviderInstance(mockStoreProvider)

      const disputeData = await disputesInstance.getDataForDispute(
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
        canRuleDispute: jest.fn().mockReturnValue(false),
        getContractAddress: jest.fn().mockReturnValue(arbitratorAddress)
      }
      disputesInstance._ArbitratorInstance = mockArbitrator

      const mockArbitrableContractData = {
        partyA,
        partyB,
        status: 3
      }
      const mockArbitrableContract = {
        getData: jest.fn().mockReturnValue(mockArbitrableContractData),
        getEvidenceForArbitrableContract: jest.fn().mockReturnValue([]),
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
        getDisputeDataForUser: jest.fn().mockReturnValue(mockUserData)
      }
      disputesInstance.setStoreProviderInstance(mockStoreProvider)

      const disputeData = await disputesInstance.getDataForDispute(
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
        canRuleDispute: jest.fn().mockReturnValue(false),
        getContractAddress: jest.fn().mockReturnValue(arbitratorAddress)
      }
      disputesInstance._ArbitratorInstance = mockArbitrator

      const mockArbitrableContractData = {
        partyA,
        partyB,
        status: 3
      }
      const mockArbitrableContract = {
        getData: jest.fn().mockReturnValue(mockArbitrableContractData),
        getEvidenceForArbitrableContract: jest.fn().mockReturnValue([]),
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
        getDisputeDataForUser: jest.fn().mockReturnValue(mockUserData)
      }
      disputesInstance.setStoreProviderInstance(mockStoreProvider)

      const disputeData = await disputesInstance.getDataForDispute(
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
