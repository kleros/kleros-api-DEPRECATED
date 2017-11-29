import KlerosWrapper from '../../../contract_wrapper/KlerosWrapper'
import Web3 from 'web3'

describe('KlerosWrapper', () => {
  let klerosInstance
  let address
  let mockContractInstance
  let BigNumber

  const _asyncMockResponse = async response => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(response)
      }, 1000)
    })
  }

  const mockWeb3 = {
    getAccount: jest.fn().mockReturnValue(_asyncMockResponse(address))
  }

  const mockStore = {
    getUserProfile: jest.fn().mockReturnValue(_asyncMockResponse({})),
    newUserProfile: jest.fn().mockReturnValue(_asyncMockResponse({}))
  }

  beforeAll(async () => {
    address = '0xDcB2db3E3fA7a6cba5dFE964408099d860246D7Z'
    klerosInstance = new KlerosWrapper(mockWeb3, mockStore, address)
    BigNumber = (new Web3()).toBigNumber(0).constructor
  })

  beforeEach(async () => {
    mockContractInstance = {
      address: address
    }

    klerosInstance.contractInstance = mockContractInstance
  })

  test('getDisputesForJuror is juror', async () => {
    const isJuror = true
    const session = 1
    const expectedResult = {
      arbitrated: 'fake-contract-address',
      appeals: 0,
      session: session,
      arbitrationFeePerJuror: 1,
      choices: 2,
      initialNumberJurors: 3,
      votes: [1,2,3],
      id: 0
    }

    const mockDisputes = [
      [
        expectedResult.arbitrated,
        new BigNumber(expectedResult.session),
        new BigNumber(expectedResult.appeals),
        new BigNumber(expectedResult.choices),
        new BigNumber(expectedResult.initialNumberJurors),
        new BigNumber(expectedResult.arbitrationFeePerJuror),
      ],
      [
        '0x',                         // signals no more disputes
      ]
    ]

    klerosInstance.contractInstance.session = jest.fn().mockReturnValue(_asyncMockResponse(new BigNumber(session)))
    klerosInstance.contractInstance.amountJurors = jest.fn().mockReturnValue(_asyncMockResponse(new BigNumber(3)))
    klerosInstance.contractInstance.isDrawn = jest.fn().mockReturnValue(_asyncMockResponse(isJuror))
    klerosInstance.contractInstance.disputes = async index => {
      return _asyncMockResponse(mockDisputes[index])
    }

    const disputes = await klerosInstance.getDisputesForJuror(address, address)

    expect(disputes).toEqual([expectedResult])
  })

  test('getDisputesForJuror not juror', async () => {
    const isJuror = false
    const session = 1
    const disputeData = {
      arbitrated: 'fake-contract-address',
      appeals: 0,
      session: session,
      arbitrationFeePerJuror: 1,
      choices: 2,
      initialNumberJurors: 3,
      votes: [1,2,3],
      id: 0
    }

    const mockDisputes = [
      [
        disputeData.arbitrated,
        new BigNumber(disputeData.session),
        new BigNumber(disputeData.appeals),
        new BigNumber(disputeData.choices),
        new BigNumber(disputeData.initialNumberJurors),
        new BigNumber(disputeData.arbitrationFeePerJuror),
      ],
      [
        '0x',                         // signals no more disputes
      ]
    ]

    klerosInstance.contractInstance.session = jest.fn().mockReturnValue(_asyncMockResponse(new BigNumber(session)))
    klerosInstance.contractInstance.amountJurors = jest.fn().mockReturnValue(_asyncMockResponse(new BigNumber(3)))
    klerosInstance.contractInstance.isDrawn = jest.fn().mockReturnValue(_asyncMockResponse(isJuror))
    klerosInstance.contractInstance.disputes = async index => {
      return _asyncMockResponse(mockDisputes[index])
    }

    const disputes = await klerosInstance.getDisputesForJuror(address, address)

    expect(disputes).toEqual([])
  })

  test('getDisputesForJuror wrong session', async () => {
    const isJuror = true
    const session = 1
    const disputeData = {
      arbitrated: 'fake-contract-address',
      appeals: 0,
      session: session - 1,
      arbitrationFeePerJuror: 1,
      choices: 2,
      initialNumberJurors: 3,
      votes: [1,2,3],
      id: 0
    }

    const mockDisputes = [
      [
        disputeData.arbitrated,
        new BigNumber(disputeData.session),
        new BigNumber(disputeData.appeals),
        new BigNumber(disputeData.choices),
        new BigNumber(disputeData.initialNumberJurors),
        new BigNumber(disputeData.arbitrationFeePerJuror),
      ],
      [
        '0x',                         // signals no more disputes
      ]
    ]

    klerosInstance.contractInstance.session = jest.fn().mockReturnValue(_asyncMockResponse(new BigNumber(session)))
    klerosInstance.contractInstance.amountJurors = jest.fn().mockReturnValue(_asyncMockResponse(new BigNumber(3)))
    klerosInstance.contractInstance.isDrawn = jest.fn().mockReturnValue(_asyncMockResponse(isJuror))
    klerosInstance.contractInstance.disputes = async index => {
      return _asyncMockResponse(mockDisputes[index])
    }

    const disputes = await klerosInstance.getDisputesForJuror(address, address)

    expect(disputes).toEqual([])
  })

  test('getDisputeByHash', async () => {
    const disputeData = {
      arbitrated: 'fake-contract-address',
      appeals: 0,
      session: session - 1,
      arbitrationFeePerJuror: 1,
      choices: 2,
      initialNumberJurors: 3,
      votes: [1,2,3],
      disputeId: 0
    }
    const mockRuling = 1

    klerosInstance._StoreProvider.getDisputeData = jest.fn().mockReturnValue(_asyncMockResponse(disputeData))
    klerosInstance.contractInstance.ruling = jest.fn().mockReturnValue(_asyncMockResponse(new BigNumber(mockRuling)))

    const disputes = await klerosInstance.getDisputesForJuror(address, address)

    expect(disputes).toEqual([])
  })
})
