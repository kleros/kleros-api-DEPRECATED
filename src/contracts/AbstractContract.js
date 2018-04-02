import _ from 'lodash'

import isRequired from '../utils/isRequired'
import delegateCalls from '../utils/delegateCalls'

class AbstractContract {
  /**
   * AbstractWrapper is the parent class for wrappers that extend the contract wrappers in
   * order to provide the underlying functionality of a contract wrapper in addition
   * to interacting with the store.
   * @param {object} implementationInstance - Contract Wrapper object to extend
   * @param {object} storeProviderWrapperInstance - StoreProvider wrapper object.
   */
  constructor(
    implementationInstance = isRequired('implementationInstance'),
    storeProviderWrapperInstance = isRequired('storeProviderWrapperInstance')
  ) {
    this._StoreProvider = storeProviderWrapperInstance
    // Should still use this._contractWrapper over this even after calls are delegating in case any calls were overwritten by child
    this._contractWrapper = implementationInstance
    delegateCalls(this, implementationInstance)
  }

  /**
   * Set the store wrapper
   * @param {object} storeProviderWrapperInstance wrapper for store
   */
  setStoreProvider = storeProviderWrapperInstance => {
    this._StoreProvider = storeProviderWrapperInstance
  }
}

export default AbstractContract
