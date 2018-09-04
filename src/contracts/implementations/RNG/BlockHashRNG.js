import BlockHashRNGArtifact from 'kleros-interaction/build/contracts/BlockHashRNGFallback'
import _ from 'lodash'

import * as ethConstants from '../../../constants/eth'
import ContractImplementation from '../../ContractImplementation'
import deployContractAsync from '../../../utils/deployContractAsync'

/**
 * Provides interaction with an instance of BlockHashRNG.
 */
class BlockHashRNG extends ContractImplementation {
  /**
   * Constructor BlockHashRNG.
   * @param {object} web3Provider - instance
   * @param {string} contractAddress - of the contract (optionnal)
   */
  constructor(web3Provider, contractAddress) {
    super(web3Provider, BlockHashRNGArtifact, contractAddress)
  }

  /**
   * BlockHashRNG deploy.
   * @param {string} account - users account
   * @param {object} web3Provider - web3 provider object
   * @returns {object} - truffle-contract Object | err The contract object or error deploy
   */
  static deploy = async (account, web3Provider) => {
    const contractDeployed = await deployContractAsync(
      account,
      0,
      BlockHashRNGArtifact,
      web3Provider
    )

    return contractDeployed
  }
}

export default BlockHashRNG
