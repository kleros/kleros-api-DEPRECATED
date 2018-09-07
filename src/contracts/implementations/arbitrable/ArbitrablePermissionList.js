import ArbitrablePermissionListArtifact from 'kleros-interaction/build/contracts/ArbitrablePermissionList'

import Arbitrable from './Arbitrable'

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
   * Fetch an item hash by disputeID
   * @param {number} disputeID The index of the dispute.
   * @returns {string} The item hash.
   */
  getItemByDisputeId = async disputeID => {
    await this.loadContract()

    return this.contractInstance.disputeIDToItem(disputeID)
  }
}

export default ArbitrablePermissionList
