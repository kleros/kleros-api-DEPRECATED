import Personal from 'web3-eth-personal'

import isRequired from '../utils/isRequired'
import { UNABLE_TO_SIGN_TOKEN } from '../constants/error'

class Auth {
  constructor(
    web3Wrapper = isRequired('web3Wrapper'),
    storeProviderInstance = isRequired('storeProviderInstance')
  ) {
    this._Web3Wrapper = web3Wrapper
    this._StoreProviderInstance = storeProviderInstance
  }

  /**
   * Set store provider instance.
   * @param {object} storeProviderInstance - instance of store provider wrapper.
   */
  setStoreProviderInstance = storeProviderInstance => {
    this._StoreProviderInstance = storeProviderInstance
  }

  /**
   * Set an auth token in the Store Provider. Call this instead of validateNewAuthToken
   * if you have a signed token saved.
   * @param {string} token - Hex representation of signed token.
   */
  setAuthToken = token => {
    this._StoreProviderInstance.setAuthToken(token)
  }

  /**
   * Validate a new auth token. Note if you validate a new token old signed tokens
   * will not longer be valid regardless of their expiration time.
   * @param {string} userAddress - Address of the user profile
   * @returns {string} Signed token for future use.
   */
  getNewAuthToken = async userAddress => {
    const unsignedToken = (await this._StoreProviderInstance.newAuthToken(
      userAddress
    )).unsignedToken

    const signedToken = await this.signMessage(userAddress, unsignedToken)
    // make sure token is valid
    if (!await this.validateAuthToken(userAddress, signedToken))
      throw new Error(UNABLE_TO_SIGN_TOKEN)

    return signedToken
  }

  /**
   * Sign a message with your private key. Uses web3 1.0 personal sign
   * @param {string} userAddress - The address with which we want to sign the message
   * @param {string} data - Hex encoded data to sign
   * @returns {string} signed data
   */
  signMessage = (userAddress, data) => {
    const ethPersonal = new Personal(this._Web3Wrapper.getProvider())
    return new Promise((resolve, reject) => {
      ethPersonal.sign(data, userAddress, (error, result) => {
        if (error) reject(error)

        resolve(result)
      })
    })
  }

  /**
   * Validate an auth token.
   * @param {string} userAddress - The address of the user.
   * @param {string} authToken - Token to check.
   * @returns {Promise} resolves to True if token is valid.
   */
  validateAuthToken = (userAddress, authToken) =>
    this._StoreProviderInstance.isTokenValid(userAddress, authToken)
}

export default Auth
