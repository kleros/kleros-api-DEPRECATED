import _ from 'lodash'

import isRequired from '../utils/isRequired'
import delegateCalls from '../utils/delegateCalls'

class AbstractContract {
  /**
   * AbstractContract wraps an implementation instance to provide access to higher level
   * services such as an off chain store, as well as the functionality of the underlying
   * implementation.
   * @param {object} implementationInstance - Contract Implementation object to extend
   * @param {object} storeProviderWrapperInstance - StoreProvider wrapper object.
   */
  constructor(
    implementationInstance = isRequired('implementationInstance'),
    storeProviderWrapperInstance = isRequired('storeProviderWrapperInstance')
  ) {
    this._StoreProvider = storeProviderWrapperInstance
    this._contractImplementation = implementationInstance
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
