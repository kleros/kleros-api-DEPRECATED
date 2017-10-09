import * as _ from 'lodash'
import ContractWrapper from './ContractWrapper'
import Kleros from 'kleros/build/contracts/MetaCoin' // FIXME mock
import contract from 'truffle-contract'
import config from '../config'

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
   * @return  address | err The address of the contract or error deploy
   */
  deploy = async (
      account = this._web3Wrapper.getAccount(0),
      value = config.VALUE,
    ) => {

    const addressContractDeployed = await this._deployAsync(
      account,
      value,
      Kleros
    )

    this.address = addressContractDeployed

    return this.address
  }

  /**
   * Get disputes. // FIXME mock
   * @return objects[]
   */
  getDisputes = async () => {
    const disputes = [
      {
        title: 'Unknown website owner',
        category: 'Category',
        deadline: '28/8/2017',
        caseId: '#1',
        status: 'Vote',
        evidence: ''
      },
      {
        title: 'Uncomplete software product',
        category: 'Web, Ecommerce',
        deadline: '28/8/2017',
        caseId: '#2',
        status: 'Opportunity to appeal',
        evidence: ''
      },
      {
        title: 'Unknown website owner',
        category: 'Web, Ecommerce',
        deadline: '10/9/2017',
        caseId: '#3',
        status: 'Execution',
        evidence: ''
      },
      {
        title: 'Stolen logo',
        category: 'Category',
        deadline: '28/8/2017',
        caseId: '#4',
        status: 'Execution',
        evidence: ''
      },
      {
        title: 'Unknown website owner',
        category: 'Category',
        deadline: '28/8/2017',
        caseId: '#5',
        status: 'Vote',
        evidence: ''
      },
      {
        title: 'Stolen logo',
        category: 'Category',
        deadline: '28/8/2017',
        caseId: '#6',
        status: 'Vote',
        evidence: ''
      },
      {
        title: 'Stolen logo',
        category: 'Category',
        deadline: '28/8/2017',
        caseId: '#7',
        status: 'Vote',
        evidence: ''
      }
    ]

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(disputes)
      }, 2000)
    })
  }
}

export default KlerosWrapper
