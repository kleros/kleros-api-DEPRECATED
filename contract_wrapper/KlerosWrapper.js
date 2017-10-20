import * as _ from 'lodash'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import kleros from 'kleros/build/contracts/MetaCoin' // FIXME mock
import config from '../config'
import disputes from './mockDisputes'

/**
 * Kleros API
 */
class KlerosWrapper extends ContractWrapper {
  /**
   * Constructor Kleros.
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
   * Kleros deploy.
   * @param   account (default: accounts[0])
   * @param   value (default: 10000)
   * @return  truffle-contract Object | err The contract object or error deploy
   */
  deploy = async (
      account = this._web3Wrapper.getAccount(0),
      value = config.VALUE,
    ) => {

    const contractDeployed = await this._deployAsync(
      account,
      value,
      kleros
    )

    this.address = addressContractDeployed.address

    return contractDeployed
  }

  /**
   * Get disputes. // FIXME mock
   * @return objects[]
   */
  getDisputes = async () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(disputes)
      }, 2000)
    })
  }

  /**
   * Get dispute by caseId. // FIXME mock
   * @return object
   */
  getDisputeById = async (caseId) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const dispute = _.filter(disputes, (o) => {return o.caseId = caseId})
        resolve(dispute[0])
      }, 2000)
    })
  }
}

export default KlerosWrapper
