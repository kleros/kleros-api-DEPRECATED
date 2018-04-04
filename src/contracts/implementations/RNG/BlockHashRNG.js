import BlockHashRNGArtifact from 'kleros-interaction/build/contracts/BlockHashRNG'
import _ from 'lodash'

import * as ethConstants from '../../../constants/eth'
import ContractImplementation from '../../ContractImplementation'
import deployContractAsync from '../../../utils/deployContractAsync'

/**
 * Kleros API
 */
class BlockHashRNG extends ContractImplementation {
  /**
   * Constructor Kleros.
   * @param {object} web3Provider - instance
   * @param {string} contractAddress - of the contract (optionnal)
   */
  constructor(web3Provider, contractAddress) {
    super(web3Provider, BlockHashRNGArtifact, contractAddress)
  }

  /**
   * Kleros deploy.
   * @param {string} account - users account
   * @param {object} web3Provider - web3 provider object
   * @returns {object} - truffle-contract Object | err The contract object or error deploy
   */
  static deploy = async (account, web3Provider) => {
    const contractDeployed = await deployContractAsync(
      account,
      ethConstants.TRANSACTION.VALUE,
      BlockHashRNGArtifact,
      web3Provider
    )

    return contractDeployed
  }
}

export default BlockHashRNG
