import _ from 'lodash'

import * as errorConstants from '../constants/error'

class AbstractWrapper {
  /**
   * AbstractWrapper is the parent class for wrappers that extend the contract wrappers in
   * order to provide the underlying functionality of a contract wrapper in addition
   * to interacting with the store.
   * @param {object} contractWrapperInstance - Contract Wrapper object to extend
   * @param {object} storeProviderWrapperInstance - StoreProvider wrapper object.
   */
  constructor(contractWrapperInstance, storeProviderWrapperInstance) {
    this._StoreProvider = storeProviderWrapperInstance
    // Should still use this._contractWrapper... over this... even after calls are delegating in case any calls were overwritten by child
    this._contractWrapper = contractWrapperInstance
  }

  /**
   * Set the store wrapper
   * @param {object} storeProviderWrapperInstance wrapper for store
   */
  setStoreProvider = storeProviderWrapperInstance => {
    this._StoreProvider = storeProviderWrapperInstance
  }

  /**
   * throws an error if Store Provider Wrapper is not set yet
   */
  _checkStoreProviderSet = () => {
    if (_.isNull(this._StoreProvider))
      throw new Error(errorConstants.NO_STORE_PROVIDER_SPECIFIED)
  }

  /**
   * Returns boolean indicating if there is a StoreProvider
   * @returns {boolean} is Store Provider set
   */
  _hasStoreProvider = () => !!this._StoreProvider
}

export default AbstractWrapper
