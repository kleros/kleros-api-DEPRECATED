import ArbitrableContractApi from '../../../src/contractWrappers/abstractWrappers/ArbitrableContract'
import ArbitrableTransaction from '../../../src/contractWrappers/ArbitrableTransactionWrapper'
import _asyncMockResponse from '../../helpers/asyncMockResponse'

describe('ArbitrableContract', async () => {
  let arbitrableContractInstance

  beforeEach(async () => {
    const _arbitrableTransaction = new ArbitrableTransaction()
    arbitrableContractInstance = new ArbitrableContractApi(
      _arbitrableTransaction
    )
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
      arbitrableContractInstance._contractWrapper.getData = mockGetData.mockReturnValue(
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

      arbitrableContractInstance.setStoreProvider(mockStore)

      const evidence = await arbitrableContractInstance.getEvidenceForArbitrableContract(
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
      arbitrableContractInstance._contractWrapper.getData = mockGetData.mockReturnValue(
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

      arbitrableContractInstance.setStoreProvider(mockStore)

      const evidence = await arbitrableContractInstance.getEvidenceForArbitrableContract(
        arbitrableContractAddress
      )

      expect(evidence).toBeTruthy()
      expect(evidence.length).toBe(1)
      expect(evidence[0].submitter).toEqual(partyA)
    })
  })
})
