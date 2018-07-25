import ArbitrablePermissionListArtifact from 'kleros-interaction/build/contracts/ArbitrablePermissionList'

import * as ethConstants from '../../../constants/eth'
import Arbitrable from './Arbitrable'
import deployContractAsync from '../../../utils/deployContractAsync'

/**
 * Provides interaction with an Arbitrable Transaction contract deployed on the blockchain.
 */
class ArbitrablePermissionList extends Arbitrable {
  /**
   * Constructor ArbitrableTransaction.
   * @param {object} web3Provider instance
   * @param {string} contractAddress of the contract
   */
  constructor(web3Provider, contractAddress) {
    super(web3Provider, ArbitrablePermissionListArtifact, contractAddress)
  }

  /**
   * Deploy ArbitrablePermissionList. TODO
   * @param {object} account Ethereum account (default account[0])
   * @param {number} value funds to be placed in contract
   * @param {object} web3Provider web3 provider object
   * @returns {object} truffle-contract Object | err The deployed contract or an error
   */
  // static deploy = async (
  //   account,
  //   value = ethConstants.TRANSACTION.VALUE,
  //   web3Provider
  // ) => {
  //   // const contractDeployed = await deployContractAsync()
  //   //
  //   // return contractDeployed
  // }

  getItemByDisputeId = async disputeId => {
    await this.loadContract()

    return this.contractInstance.disputeIDToItem(disputeId)
  }
}

export default ArbitrablePermissionList
