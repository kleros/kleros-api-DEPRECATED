import PinakionPOCArtifact from 'kleros-interaction/build/contracts/MiniMeTokenERC20'
import _ from 'lodash'

import * as ethConstants from '../../../constants/eth'
import * as errorConstants from '../../../constants/error'
import ContractImplementation from '../../ContractImplementation'
import deployContractAsync from '../../../utils/deployContractAsync'
import isRequired from '../../../utils/isRequired'

/**
 * Provides interaction with a PinakionPOC contract deployed on the blockchain.
 */
class MiniMePinakion extends ContractImplementation {
  /**
   * Constructor PinakionPOC.
   * @param {object} web3Provider - web3 instance.
   * @param {string} contractAddress - of the contract (optionnal).
   */
  constructor(web3Provider, contractAddress) {
    super(web3Provider, PinakionPOCArtifact, contractAddress)
  }

  /**
   * Deploy a new instance of PinakionPOC.
   * @param {string} account - account of user
   * @param {object} web3Provider - web3 provider object
   * @param {string} tokenFactoryAddress - The address of the MiniMeTokenFactory contract that will create the Clone token contracts
   * @param {string} parentTokenAddress - Address of the parent token, set to 0x0 if it is a new token
   * @param {number} parentSnapshotBlock - Block of the parent token that will determine the initial distribution of the clone token, set to 0 if it is a new token
   * @param {string} tokenName - Name of the token.
   * @param {number} decimalUnits - Number of decimal units token is divisible by.
   * @param {string} tokenSymbol - Abreviated symbol to represent the token.
   * @param {bool} transfersEnabled - If users can transfer tokens.
   * @returns {object} - 'truffle-contract' Object | err The contract object or error deploy.
   */
  static deploy = async (
    account = isRequired('account'),
    web3Provider = isRequired('web3Provider'),
    tokenFactoryAddress = isRequired('tokenFactoryAddress'),
    parentTokenAddress = '0x0',
    parentSnapshotBlock = 0,
    tokenName = 'Pinakion',
    decimalUnits = 18,
    tokenSymbol = 'PNK',
    transfersEnabled = true
  ) => {
    const contractDeployed = await deployContractAsync(
      account,
      0, // value
      PinakionPOCArtifact,
      web3Provider,
      tokenFactoryAddress, // args
      parentTokenAddress,
      parentSnapshotBlock,
      tokenName,
      decimalUnits,
      tokenSymbol,
      transfersEnabled
    )

    return contractDeployed
  }

  /**
   * Transfer ownership of the PNK contract to the kleros POC contract.
   * @param {string} klerosAddress - Address of Kleros POC contract.
   * @param {string} account - Address of user.
   * @returns {object} - The result transaction object.
   */
  changeController = async (
    klerosAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.changeController(klerosAddress, {
        from: account,
        gas: ethConstants.TRANSACTION.GAS
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_TRANSFER_OWNERSHIP)
    }
  }

  /**
   * Approve the arbitrator contract to transfer PNK to the contract and call the arbitrators
   * receiveApproval()
   * @param {string} arbitratorAddress - The address of the arbitrator contract.
   * @param {number} amount - The amount of PNK to transfer.
   * @param {string} account - The users account.
   * @returns {bool} If the transfer succeeded or not
   */
  approveAndCall = async (arbitratorAddress, amount, account = this._Web3Wrapper.getAccount(0)) => {
    await this.loadContract()

    return this.contractInstance.approveAndCall(
      arbitratorAddress,
      this._Web3Wrapper.toWei(amount, 'ether'),
      '0x0',
      {
        from: account,
        gas: ethConstants.TRANSACTION.GAS
      }
    )
  }

  /**
   * Get the token balance for an account
   * @param {string} account - The users account.
   * @returns {number} the amount of tokens.
   */
  getTokenBalance = async (account) => {
    await this.loadContract()

    return this.contractInstance.balanceOf(account)
  }
}

export default MiniMePinakion
