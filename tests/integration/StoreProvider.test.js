import Web3 from 'web3'

import Kleros from '../../src/kleros'
import * as ethConstants from '../../src/constants/eth'

describe('StoreProviderWrapper', () => {
  let KlerosInstance
  let storeProvider

  beforeAll(async () => {
    // use testRPC
    const provider = await new Web3.providers.HttpProvider(
      ethConstants.LOCALHOST_ETH_PROVIDER
    )

    KlerosInstance = await new Kleros(provider)

    storeProvider = await KlerosInstance.getStoreWrapper()
  })

  it('new user profile', async () => {
    const testAddress = 'testAddress' + Math.random()

    const newProfile = await storeProvider.setUpUserProfile(testAddress)
    expect(newProfile).toBeTruthy()
  })
})
