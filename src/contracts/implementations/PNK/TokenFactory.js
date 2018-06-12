import {
  MiniMeTokenFactoryAbi,
  MiniMeTokenFactoryByteCode
} from 'minimetoken/build/MiniMeToken.sol'
import _ from 'lodash'

import ContractImplementation from '../../ContractImplementation'
import deployContractAsync from '../../../utils/deployContractAsync'

/**
 * Provides interaction with a PinakionPOC contract deployed on the blockchain.
 */
class TokenFactory extends ContractImplementation {
  /**
   * Constructor PinakionPOC.
   * @param {object} web3Provider - web3 instance.
   * @param {string} contractAddress - of the contract (optionnal).
   */
  constructor(web3Provider, contractAddress) {
    const artifact = {
      abi: MiniMeTokenFactoryAbi,
      bytecode: MiniMeTokenFactoryByteCode
    }
    super(web3Provider, artifact, contractAddress)
  }

  /**
   * Deploy a new instance of PinakionPOC.
   * @param {string} account - account of user
   * @param {object} web3Provider - web3 provider object
   * @returns {object} - 'truffle-contract' Object | err The contract object or error deploy.
   */
  static deploy = async (account, web3Provider) => {
    const artifact = {
      abi: MiniMeTokenFactoryAbi,
      bytecode: MiniMeTokenFactoryByteCode
    }

    const contractDeployed = await deployContractAsync(
      account, // account
      0, // value
      artifact, // artifact
      web3Provider // web3
    )

    return contractDeployed
  }
}

export default TokenFactory
