import * as _ from 'lodash'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
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
  constructor(web3Provider, address) {
    super(web3Provider)

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
   * Create a dispute. // FIXME mock
   * @param  choices Amount of choices the arbitrator can make in this dispute.
   *                 When ruling ruling<=choices.
   * @param  extraData Can be used to give additional info on the dispute
   *                   to be created.
   * @return txHash hash transaction
   */
  createDispute = async (choices, extraData=null) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve('0xeb3447da6db41b9b86570c02c97c35d8645175e9d2bb0d19ba8e486c8c78255d')
      }, 1000)
    })
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
