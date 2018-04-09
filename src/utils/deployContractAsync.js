import contract from 'truffle-contract'

import * as ethConstants from '../../constants/eth'
import { UNABLE_TO_DEPLOY_CONTRACT } from '../../constants/error'

import isRequired from './isRequired'

/**
 * Deploy a contract on the Ethereum network using the contract artifact.
 * @param {string} account - The account to deploy it under.
 * @param {number} value - The value to send.
 * @param {object} artifact - JSON artifact of the contract.
 * @param {object} web3Provider - Web3 Provider object (NOTE NOT Kleros Web3Wrapper)
 * @param {...any} args - Extra arguments.
 * @returns {object} - truffle-contract Object | err The contract object or an error
 */
const deployContractAsync = async (
  account = isRequired('account'),
  value = isRequired('value'),
  artifact = isRequired('artifact'),
  web3Provider = isRequired('web3Provider'),
  ...args
) => {
  try {
    const MyContract = contract({
      abi: artifact.abi,
      unlinked_binary: artifact.bytecode
        ? artifact.bytecode
        : artifact.unlinked_binary
    })
    MyContract.setProvider(web3Provider)

    return MyContract.new(...args, {
      from: account,
      value: value,
      gas: ethConstants.TRANSACTION.GAS
    })
  } catch (err) {
    console.error(err)
    throw new Error(UNABLE_TO_DEPLOY_CONTRACT)
  }
}

export default deployContractAsync
