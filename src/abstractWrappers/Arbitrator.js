import _ from 'lodash'

import AbstractWrapper from './AbstractWrapper'

/**
 * Arbitrator API.
 */
class Arbitrator extends AbstractWrapper {
  /**
   * Arbitrator Constructor.
   * @param {object} arbitratorWrapper - arbitrator contract wrapper object.
   * @param {object} eventListener - event listener object.
   */
  constructor(arbitratorWrapper, eventListener) {
    super(arbitratorWrapper, undefined, eventListener)
  }

  /**
   * Buy PNK.
   * @param {number} amount - Number of pinakion to buy.
   * @param {string} arbitratorAddress - Arbitrator contract's address.
   * @param {string} account - Address of user.
   * @returns {object[]} - Balance of user.
   */
  buyPNK = async (
    amount,
    arbitratorAddress, // address of KlerosPOC
    account
  ) => {
    await this._Arbitrator.buyPNK(amount, arbitratorAddress, account)
    return this._Arbitrator.getPNKBalance(arbitratorAddress, account)
  }
}

export default Arbitrator
