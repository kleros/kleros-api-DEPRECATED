import multipleArbitrableTransactionArtifact from 'kleros-interaction/build/contracts/MultipleArbitrableTransaction'
import _ from 'lodash'

import * as contractConstants from '../../../constants/contract'
import * as errorConstants from '../../../constants/error'
import deployContractAsync from '../../../utils/deployContractAsync'

import Arbitrable from './Arbitrable'

/**
 * Provides interaction with an Arbitrable Transaction contract deployed on the blockchain.
 */
class MultipleArbitrableTransaction extends Arbitrable {
  /**
   * Constructor ArbitrableTransaction.
   * @param {object} web3Provider instance
   * @param {string} contractAddress of the contract
   */
  constructor(web3Provider, contractAddress) {
    super(web3Provider, multipleArbitrableTransactionArtifact, contractAddress)

    this.arbitrableTransactionId = null
  }

  /**
   * Deploy MultipleArbitrableTransaction.
   * @param {object} account Ethereum account
   * @param {object} web3Provider web3 provider object
   * @returns {object} truffle-contract Object | err The deployed contract or an error
   */
  static deploy = async (account, web3Provider) => {
    const contractDeployed = await deployContractAsync(
      account,
      0,
      multipleArbitrableTransactionArtifact,
      web3Provider
    )

    return contractDeployed
  }

  /**
   * Create MultipleArbitrableTransaction.
   * @param {object} account Ethereum account
   * @param {string} arbitratorAddress The address of the arbitrator contract
   * @param {object} seller Seller Ethereum account
   * @param {number} value funds to be placed in contract
   * @param {number} timeout Time (seconds) after which a party automatically loose a dispute. (default 3600)
   * @param {bytes} arbitratorExtraData Extra data for the arbitrator. (default empty string)
   * @param {string} metaEvidenceUri Uri meta-evidence. (default empty string)
   * @returns {object} truffle-contract Object | err The deployed contract or an error
   */
  createArbitrableTransaction = async (
    account,
    arbitratorAddress,
    seller,
    value,
    timeout = 3600,
    arbitratorExtraData = 0x0,
    metaEvidenceUri
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.createTransaction(
        arbitratorAddress,
        timeout,
        seller,
        arbitratorExtraData,
        metaEvidenceUri,
        {
          from: account,
          value: value,
          gas: process.env.GAS || undefined
        }
      )
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_CREATE_TRANSACTION)
    }
  }

  /**
   * Pay the seller. To be called when the good is delivered or the service rendered.
   * @param {string} account - Ethereum account.
   * @param {number} arbitrableTransactionId - The index of the transaction.
   * @param {amount} amount - Part or all of the amount of the good or the service.
   * @returns {object} - The result transaction object.
   */
  pay = async (
    account,
    arbitrableTransactionId,
    amount
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.pay(arbitrableTransactionId, amount, {
        from: account,
        value: 0
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_PAY_SELLER)
    }
  }

  /**
   * Reimburse the seller. To be called when the good is not delivered or the service rendered.
   * @param {string} account - Ethereum account.
   * @param {number} arbitrableTransactionId - The index of the transaction.
   * @param {amount} amount - Part or all of the amount of the good or the service.
   * @returns {object} - The result transaction object.
   */
  reimburse = async (
    account,
    arbitrableTransactionId,
    amount
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.reimburse(arbitrableTransactionId, amount, {
        from: account,
        value: 0
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_REIMBURSE_BUYER)
    }
  }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the buyer.
   * @param {string} account - Ethereum account.
   * @param {number} arbitrableTransactionId - The index of the transaction.
   * @param {number} arbitrationCost - Arbitration cost.
   * @returns {object} - The result transaction object.
   */
  payArbitrationFeeByBuyer = async (
    account,
    arbitrableTransactionId,
    arbitrationCost
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.payArbitrationFeeByBuyer(
        arbitrableTransactionId,
        {
          from: account,
          value: arbitrationCost
        }
      )
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_PAY_ARBITRATION_FEE)
    }
  }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the seller.
   * @param {string} account Ethereum account.
   * @param {number} arbitrableTransactionId - The index of the transaction.
   * @param {number} arbitrationCost - Arbitration cost.
   * @returns {object} - The result transaction object.
   */
  payArbitrationFeeBySeller = async (
    account,
    arbitrableTransactionId,
    arbitrationCost
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.payArbitrationFeeBySeller(
        arbitrableTransactionId,
        {
          from: account,
          value: arbitrationCost,
          gas: process.env.GAS || undefined
        }
      )
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_PAY_ARBITRATION_FEE)
    }
  }

  /**
   * Submit evidence.
   * @param {string} account ETH address of user.
   * @param {number} arbitrableTransactionId - The index of the transaction.
   * @param {string} url A link to an evidence using its URI.
   * @returns {string} txHash Hash transaction.
   */
  submitEvidence = async (
    account,
    arbitrableTransactionId,
    url
  ) => {
    await this.loadContract()

    const txHashObj = await this.contractInstance.submitEvidence(
      arbitrableTransactionId,
      url,
      {
        from: account,
        value: 0
      }
    )

    return txHashObj.tx
  }

  /**
   * Call by buyer if seller is timeout
   * @param {string} account ETH address of user
   * @param {number} arbitrableTransactionId - The index of the transaction.
   * @returns {object} The result transaction object.
   */
  callTimeOutBuyer = async (
    account,
    arbitrableTransactionId
  ) => {
    await this.loadContract()

    const transactionArbitrableData = await this.getData(
      arbitrableTransactionId
    )

    const status = transactionArbitrableData.status
    const timeout = transactionArbitrableData.timeout
    const lastInteraction = transactionArbitrableData.lastInteraction

    if (status !== contractConstants.STATUS.WAITING_SELLER) {
      throw new Error(errorConstants.CONTRACT_IS_NOT_WAITING_ON_OTHER_PARTY)
    } else if (Math.trunc(Date.now() / 1000) <= lastInteraction + timeout) {
      throw new Error(errorConstants.TIMEOUT_NOT_REACHED)
    }

    try {
      return this.contractInstance.timeOutByBuyer(arbitrableTransactionId, {
        from: account,
        value: 0
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_CALL_TIMEOUT)
    }
  }

  /**
   * Call by seller if buyer is timeout.
   * @param {string} account - ETH address of user.
   * @param {number} arbitrableTransactionId - The index of the transaction.
   * @param {string} contractAddress - ETH address of contract.
   * @returns {object} The result transaction object.
   */
  callTimeOutSeller = async (
    account,
    arbitrableTransactionId
  ) => {
    await this.loadContract()

    const status = await this.contractInstance.status()
    const timeout = await this.contractInstance.timeout()
    const lastInteraction = await this.contractInstance.lastInteraction()

    if (status !== contractConstants.STATUS.WAITING_BUYER) {
      throw new Error(errorConstants.CONTRACT_IS_NOT_WAITING_ON_OTHER_PARTY)
    } else if (Date.now() >= lastInteraction + timeout) {
      throw new Error(errorConstants.TIMEOUT_NOT_REACHED)
    }

    try {
      return this.contractInstance.timeOutBySeller(arbitrableTransactionId, {
        from: account,
        value: 0
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_CALL_TIMEOUT)
    }
  }

  /**
   * Appeal an appealable ruling.
   * @param {string} account Ethereum account.
   * @param {number} arbitrableTransactionId - The index of the transaction.
   * @param {bytes} extraData for the arbitrator appeal procedure.
   * @param {number} appealCost Amount to pay the arbitrator. (default 0.35 ether).
   * @returns {object} - The result transaction object.
   */
  appeal = async (
    account,
    arbitrableTransactionId,
    extraData = 0x0,
    appealCost = 0.3
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.appeal(arbitrableTransactionId, extraData, {
        from: account,
        value: appealCost
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_RAISE_AN_APPEAL)
    }
  }

  /**
   * Set the arbitrable transaction id
   * @param {number} arbitrableTransactionId - The index of the transaction.
   * @returns {object} Object Data of the contract.
   */
  setArbitrableTransactionId = arbitrableTransactionId =>
    (this.arbitrableTransactionId = arbitrableTransactionId)

  /**
   * Data of the contract
   * @param {number} arbitrableTransactionId - The index of the transaction.
   * @returns {object} Object Data of the contract.
   */
  getData = async arbitrableTransactionId => {
    await this.loadContract()

    const arbitrableTransaction = await this.contractInstance.transactions(
      arbitrableTransactionId
    )

    return {
      seller: arbitrableTransaction[0],
      buyer: arbitrableTransaction[1],
      amount: arbitrableTransaction[2].toNumber(),
      timeout: arbitrableTransaction[3].toNumber(),
      disputeId: arbitrableTransaction[4].toNumber(),
      arbitrator: arbitrableTransaction[5],
      arbitratorExtraData: arbitrableTransaction[6],
      sellerFee: this._Web3Wrapper.fromWei(arbitrableTransaction[7], 'ether'),
      buyerFee: this._Web3Wrapper.fromWei(arbitrableTransaction[8], 'ether'),
      lastInteraction: arbitrableTransaction[9].toNumber(),
      status: arbitrableTransaction[10].toNumber()
    }
  }
}

export default MultipleArbitrableTransaction
