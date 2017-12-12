class AbstractWrapper {
  /**
   * AbstractWrapper is the parent class for abstract classes that interact with the
   * store and the contract wrappers. The purpose of these classes are to separate the
   * metadata storage and retrieval logic from the on chain contracts.
   * @param {object} storeProvider store provider object
   * @param {object} arbitratorWrapper arbitrator contract wrapper object
   * @param {object} arbitrableWrapper arbitrable contract wrapper object
   */
  constructor(storeProvider, arbitratorWrapper, arbitrableWrapper) {
    this._StoreProvider = storeProvider
    this._Arbitrator = arbitratorWrapper
    this._ArbitrableContract = arbitrableWrapper
  }

  /**
  * set store wrapper
  * @param {object} storeWrapper wrapper for store
  */
  setStore = storeWrapper => {
    this._StoreProvider = storeWrapper
  }

  /**
  * set Arbitrator wrapper
  * @param {object} arbitratorWrapper wrapper for arbitrator contract
  */
  setArbitrator = arbitratorWrapper => {
    this._Arbitrator = arbitratorWrapper
  }

  /**
  * set Arbitrable wrapper
  * @param {object} arbitrableWrapper wrapper for arbitrable contract
  */
  setArbitrable = arbitrableWrapper => {
    this._ArbitrableContract = arbitrableWrapper
  }

  /**
  * I can't wait for decorators
  * throws an error if Arbitrator and Arbitable contract wrappers are not set yet
  */
  _checkArbitratorWrappersSet = () => {
    if (!this._Arbitrator) throw new Error('No Arbitrator Contract Wrapper specified. Please call setArbitrator')
  }

  /**
  * I can't wait for decorators
  * throws an error if Arbitrator and Arbitable contract wrappers are not set yet
  */
  _checkArbitrableWrappersSet = () => {
    if (!this._ArbitrableContract) throw new Error('No Arbitrable Contract Wrapper specified. Please call setArbitrable')
  }

  /**
  * Load instance of arbitrator contract
  * @param {string} arbitratorAddress address
  * @return instance of arbitrator contract wrapper
  */
  _loadArbitratorInstance = async arbitratorAddress => {
    this._checkArbitratorWrappersSet()
    return await this._Arbitrator.load(arbitratorAddress)
  }

  /**
  * Load instance of arbitrable contract
  * @param {string} arbitrableAddress address
  * @return instance of arbitrable contract wrapper
  */
  _loadArbitrableInstance = async arbitrableAddress => {
    this._checkArbitrableWrappersSet()
    return await this._ArbitrableContract.load(arbitrableAddress)
  }
}

export default AbstractWrapper
