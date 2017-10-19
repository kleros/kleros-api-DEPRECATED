import * as _ from 'lodash'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import CentralizedArbitratorDispute from '../src/disputes/CentralizedArbitratorDispute'
import centralizedArbitrator from 'kleros-interaction/build/contracts/CentralizedArbitrator'
import config from '../config'

/**
 * CentralizedArbitrator API
 */
class CentralizedArbitratorWrapper extends ContractWrapper {
  /**
   * Constructor CentralizedArbitrator.
   * @param web3 instance
   * @param address of the contract (optionnal)
   */
  constructor(web3Provider, storeProvider, address) {
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
   * @return success bool
   */
  load = async (
    address
  ) => {
    try {
      const contractInstance = await this._instantiateContractIfExistsAsync(centralizedArbitrator, address)
      this.contractInstance = contractInstance
      this.address = address
      return true
    } catch (e) {
      return false
    }
  }

  /**
   * Get dispute by caseId.
   * @param contractId contract id of dispute
   * @param artifact defaults to CentralizedArbitrator
   * @return CentralizedArbitratorDispute object
   */
  getDisputeById = async disputeId => {
    // load contract
    if (!this.contractInstance) {
      if (!this.address) {
        return new Error("Wrapper does not have court address")
      }
      let success = await this.load(this.address)
      if (!success) {
        return new Error("Cannot load contract instance")
      }
    }

    let disputes = await this.contractInstance.disputes()
    const dispute = disputes[disputeId]
    console.log(dispute)
    return new CentralizedArbitratorDispute(this._StoreProvider, dispute)
  }

  /**
   * Give a ruling. UNTRUSTED. // FIXME mock
   * @param  disputeId ID of the dispute to rule.
   * @param  ruling Ruling given by the arbitrator. Note that 0 means
   *                "Not able/wanting to make a decision".
   * @return txHash hash transaction
   */
  giveRuling = async (disputeId, ruling) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve('0xeb3447da6db41b9b86570c02c97c35d8645175e9d2bb0d19ba8e486c8c78255d')
      }, 1000)
    })
  }
}

export default CentralizedArbitratorWrapper
