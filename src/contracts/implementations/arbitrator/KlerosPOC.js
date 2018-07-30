import klerosPOCArtifact from 'kleros/build/contracts/KlerosPOC'
import _ from 'lodash'

import * as ethConstants from '../../../constants/eth'
import * as errorConstants from '../../../constants/error'
import * as arbitratorConstants from '../../../constants/arbitrator'
import ContractImplementation from '../../ContractImplementation'
import deployContractAsync from '../../../utils/deployContractAsync'
import EventListener from '../../../utils/EventListener'

import Kleros from './Kleros'

/**
 * Provides interaction with a KlerosPOC contract on the blockchain.
 */
class KlerosPOC extends Kleros {
  /**
   * Create new KlerosPOC Implementation.
   * @param {object} web3Provider - web3 instance.
   * @param {string} contractAddress - Address of the KlerosPOC contract.
   */
  constructor(web3Provider, contractAddress) {
    super(web3Provider, contractAddress, klerosPOCArtifact)
  }

  /**
   * Purchase PNK.
   * @param {string} amount - The number of pinakion to buy.
   * @param {string} account - The address of the user.
   * @returns {object} - The result transaction object.
   */
  buyPNK = async (amount, account = this._Web3Wrapper.getAccount(0)) => {
    await this.loadContract()

    try {
      return this.contractInstance.buyPinakion({
        from: account,
        gas: ethConstants.TRANSACTION.GAS,
        value: this._Web3Wrapper.toWei(amount, 'ether')
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_BUY_PNK)
    }
  }
}

export default KlerosPOC
