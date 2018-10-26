import { BN } from 'ethjs'
import bondingCurveArtifact from 'kleros-interaction/build/contracts/BondingCurve'

import ContractImplementation from '../ContractImplementation'
import * as errorConstants from '../../constants/error'

import MiniMePinakion from './PNK/MiniMePinakion'

/**
 * Provides interaction with a bonding curve contract on the blockchain.
 */
class BondingCurve extends ContractImplementation {
  /**
   * Create new Bonding Curve Implementation.
   * @param {object} web3Provider - web3 instance.
   * @param {string} contractAddress - Address of the Bonding Curve contract.
   */
  constructor(web3Provider, contractAddress) {
    super(web3Provider, bondingCurveArtifact, contractAddress)
  }

  /**
   * Fetch the total amount of ETH in the bonding curve.
   * @returns {number} - The total amount of ETH as a BigNumber.
   */
  getTotalETH = async () => {
    await this.loadContract()
    try {
      return this.contractInstance.totalETH()
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_FETCH_TOTAL_ETH)
    }
  }

  /**
   * Fetch the total amount of bonded token in the bonding curve.
   * @returns {number} - The total amount of bonded token as a BigNumber.
   */
  getTotalTKN = async () => {
    await this.loadContract()
    try {
      return this.contractInstance.totalTKN()
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_FETCH_TOTAL_TKN)
    }
  }

  /**
   * Fetch the spead of the bonding curve.
   * @returns {number} - The spread as a BigNumber.
   */
  getSpread = async () => {
    await this.loadContract()
    try {
      return this.contractInstance.spread()
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_FETCH_SPREAD)
    }
  }

  /**
   * Buy bonded token from the bonding curve.
   * @param {string} receiver - The account the brought token is accredited to.
   * @param {string} minTKN - The minimum amount of bonded token expected in return.
   * @param {string} amount - The amount of ETH to spend.
   * @param {string} account - The address of the buyer.
   * @returns {object} - The result transaction object.
   */
  buy = async (receiver, minTKN, amount, account) => {
    await this.loadContract()
    return this.contractInstance.buy(receiver, minTKN, {
      from: account,
      value: amount,
      gas: process.env.GAS || undefined
    })
  }

  /**
   * Sell bonded token to the bonding curve.
   * @param {string} amountTKN - The amount of token to sell.
   * @param {stirng} receiverAddr - The address to receive ETH.
   * @param {string} minETH - The minimum amount of ETH expected in return.
   * @param {string} account - The address of the seller.
   * @returns {object} - The result transaction object.
   */
  sell = async (amountTKN, receiverAddr, minETH, account) => {
    await this.loadContract()

    const pinakionContractAddress = await this.contractInstance.tokenContract()
    const pnkInstance = new MiniMePinakion(
      this.getWeb3Provider(),
      pinakionContractAddress
    )

    // See BondingCurve.sol in kleros-interaction for the definition of extraData.
    const extraData =
      '0x62637331' + // Magic number for string "bcs1"
      (receiverAddr.startsWith('0x') ? receiverAddr.slice(2) : receiverAddr) +
      new BN(minETH).toString(16, 64)

    return pnkInstance.approveAndCall(
      this.contractAddress,
      amountTKN,
      account,
      extraData
    )
  }
}

export { BondingCurve }
