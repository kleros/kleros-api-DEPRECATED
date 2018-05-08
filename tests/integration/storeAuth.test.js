import Web3 from 'web3'
import sigUtil from 'eth-sig-util'

import Kleros from '../../src/kleros'
import * as ethConstants from '../../src/constants/eth'

describe('Auth', () => {
  let web3
  let loggedInUserAddress

  beforeAll(async () => {
    const provider = await new Web3.providers.HttpProvider(
      ethConstants.LOCALHOST_ETH_PROVIDER
    )
    web3 = await new Web3(provider)

    loggedInUserAddress = web3.eth.accounts[0]
  })

  it('can sign auth token', async () => {
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

    const mockToken =
      '0x7b2276657273696f6e223a312c2265787069726174696f6e223a313532353830303831313932307d'
    const mockStoreProvider = {
      newAuthToken: () => ({ unsignedToken: mockToken }),
      setAuthToken: () => true,
      isTokenValid: () => true
    }
    // set new store provider
    klerosInstance.auth.setStoreProviderInstance(mockStoreProvider)

    // FIXME testrpc/ganache clients don't support personal_sign yet. Remove this mock once they do.
    klerosInstance.auth.signMessage = (userAddress, data) =>
      new Promise((resolve, reject) => {
        web3.eth.sign(userAddress, data, (error, result) => {
          if (error) reject(error)

          resolve(result)
        })
      })

    const signedToken = await klerosInstance.auth.getNewAuthToken(
      loggedInUserAddress
    )

    expect(signedToken).toBeTruthy()

    // validate token
    const msgParams = {
      data: mockToken,
      sig: signedToken
    }

    const authorizedUser = await sigUtil.recoverPersonalSignature(msgParams)

    expect(authorizedUser).toEqual(loggedInUserAddress)
  })
})
