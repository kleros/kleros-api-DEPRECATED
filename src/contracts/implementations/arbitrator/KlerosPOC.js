import klerosPOCArtifact from 'kleros/build/contracts/KlerosPOC'
import _ from 'lodash'

import * as ethConstants from '../../../constants/eth'
import deployContractAsync from '../../../utils/deployContractAsync'

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
   * STATIC: Deploy a KlerosPOC contract on the blockchain.
   * @param {string} rngAddress address of random number generator contract
   * @param {string} pnkAddress address of pinakion contract
   * @param {number[]} timesPerPeriod array of 5 ints indicating the time limit for each period of contract
   * @param {string} account address of user
   * @param {number} value amout of eth to send to contract
   * @param {object} web3Provider web3 provider object NOTE: NOT Kleros Web3Wrapper
   * @returns {object} truffle-contract Object | err The contract object or error deploy
   */
  static deploy = async (
    rngAddress,
    pnkAddress,
    timesPerPeriod = [300, 0, 300, 300, 300],
    account,
    value = ethConstants.TRANSACTION.VALUE,
    web3Provider
  ) => {
    const contractDeployed = await deployContractAsync(
      account,
      value,
      klerosPOCArtifact,
      web3Provider,
      pnkAddress,
      rngAddress,
      timesPerPeriod
    )

    return contractDeployed
  }

  /**
   * Purchase PNK.
   * @param {string} amount - The amount of pinakion to buy in wei.
   * @param {string} account - The address of the user.
   * @returns {object} - The result transaction object.
   */
  buyPNK = async (amount, account) => {
    await this.loadContract()
    return this.contractInstance.buyPinakion({
      from: account,
      value: amount,
      gas: process.env.GAS || undefined
    })
  }
}

export default KlerosPOC
