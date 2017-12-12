import * as _ from 'lodash'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import ArbitrableTransactionWrapper from './ArbitrableTransactionWrapper'
import centralizedArbitrator from 'kleros-interaction/build/contracts/CentralizedArbitrator'
import config from '../../config'

/**
 * CentralizedArbitrator API
 */
class CentralizedArbitratorWrapper extends ContractWrapper {
  /**
   * Constructor CentralizedArbitrator.
   * @param web3 instance
   * @param address of the contract (optionnal)
   */
  constructor(web3Provider, address) {
    super(web3Provider, storeProvider)

    if (!_.isUndefined(address)) {
      this.address = address
    }
    this.contractInstance = null
  }

  /**
   * Deploy CentralizedArbitrator.
   * @param   account Ethereum account
   * @param   value gas price value
   * @param   price Set the initial arbitration price. (default: 10000 wei)
   * @return  truffle-contract Object | err The contract object deployed or an error
   */
  deploy = async (
      account,
      value = config.VALUE,
      priceArbitration = 10000
    ) => {

    const contractDeployed = await this._deployAsync(
      account,
      value,
      centralizedArbitrator,
      priceArbitration
    )

    this.address = contractDeployed.address

    return contractDeployed
  }

  /**
   * Load an existing contract
   * @param address contract address
   * @return Conract Instance | Error
   */
  load = async (
    address
  ) => {
    try {
      const contractInstance = await this._instantiateContractIfExistsAsync(centralizedArbitrator, address)
      this.contractInstance = contractInstance
      this.address = address
      return contractInstance
    } catch (e) {
      throw new Error(e)
    }
  }
}

export default CentralizedArbitratorWrapper
