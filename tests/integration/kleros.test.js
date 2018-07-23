import Web3 from 'web3'

import Kleros from '../../src/kleros'
import * as ethConstants from '../../src/constants/eth'

describe('Kleros', () => {
  let klerosInstance
  const mockArbitrator = '0x0'
  const mockArbitrable = '0x1'
  // taken from web3js documentation - TODO: TRUE random address
  const randomEthAddress = '0xc1912fee45d61c87cc5ea59dae31190fffff232d'
  beforeAll(() => {
    const mockStoreUri = ''
    const ethProvider = new Web3.providers.HttpProvider(
      ethConstants.LOCALHOST_ETH_PROVIDER
    )

    klerosInstance = new Kleros(
      ethProvider,
      mockStoreUri,
      mockArbitrator,
      mockArbitrable
    )
  })
  it('can be created', () => {
    expect(klerosInstance.arbitrator).toBeTruthy()
    expect(klerosInstance.arbitrable).toBeTruthy()
    expect(klerosInstance.disputes).toBeTruthy()
    expect(klerosInstance.notifications).toBeTruthy()

    expect(klerosInstance.arbitrator.getContractAddress()).toEqual(
      mockArbitrator
    )
    expect(klerosInstance.arbitrable.getContractAddress()).toEqual(
      mockArbitrable
    )
  })
  it('web3wrapper', () => {
    // Utils functions
    expect(
      klerosInstance.web3Wrapper._getNetworkIdIfExistsAsync()
    ).resolves.toBeTruthy()
    expect(klerosInstance.web3Wrapper.isAddress(randomEthAddress)).toBe(true)
    expect(klerosInstance.web3Wrapper.getAccount(0)).toBeTruthy()
    expect(klerosInstance.web3Wrapper.getProvider()).toBeTruthy()
    expect(klerosInstance.web3Wrapper.getCoinbase()).toBeTruthy()
    expect(klerosInstance.web3Wrapper.toWei('1', 'finney')).toBe(
      1000000000000000
    )
    expect(
      klerosInstance.web3Wrapper.fromWei('21000000000000', 'finney').toString()
    ).toBe('0.021')
    expect(
      klerosInstance.web3Wrapper
        .toBigNumber('200000000000000000000001')
        .toString(10)
    ).toBe('200000000000000000000001')
    // Balance/user functions
    expect(klerosInstance.web3Wrapper.getBalanceInWeiAsync()).toBeTruthy()
    expect(
      klerosInstance.web3Wrapper.doesContractExistAtAddressAsync(
        randomEthAddress
      )
    ).resolves.toBeTruthy()
    // Block tests
    expect(klerosInstance.web3Wrapper.getBlock(10)).resolves.toBeTruthy()
    expect(klerosInstance.web3Wrapper.blockNumber()).toBeTruthy()
  })
})
