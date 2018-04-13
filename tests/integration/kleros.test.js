import Web3 from 'web3'

import Kleros from '../../src/kleros'
import * as ethConstants from '../../src/constants/eth'

describe('Kleros', () => {
  it('can be created', () => {
    const mockStoreUri = ''
    const ethProvider = new Web3.providers.HttpProvider(
      ethConstants.LOCALHOST_ETH_PROVIDER
    )
    const mockArbitrator = '0x0'
    const mockArbitrable = '0x1'

    const klerosInstance = new Kleros(
      ethProvider,
      mockStoreUri,
      mockArbitrator,
      mockArbitrable
    )

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
})
