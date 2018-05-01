import isRequired from '../utils/isRequired'

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
  validateNewAuthToken = async userAddress => {
    const unsignedToken = await this._StoreProviderInstance.newAuthToken(
      userAddress
    )

    const signedToken = this.signMessage(userAddress, unsignedToken)
    this.setAuthToken(signedToken)
    return signedToken
  }

  /**
   * Sign a message with your private key.
   * @param {string} userAddress - The address with which we want to sign the message
   * @param {string} data - Hex encoded data to sign
   * @returns {string} signed data
   */
  signMessage = (userAddress, data) => this._Web3Wrapper.sign(userAddress, data)
}

export default Auth
