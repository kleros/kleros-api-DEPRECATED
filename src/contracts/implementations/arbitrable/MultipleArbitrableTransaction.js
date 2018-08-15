import multipleArbitrableTransactionArtifact from 'kleros-interaction/build/contracts/MultipleArbitrableTransaction'
import _ from 'lodash'

import * as ethConstants from '../../../constants/eth'
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
  }

  /**
   * Deploy MultipleArbitrableTransaction.
   * @param {object} account Ethereum account (default account[0])
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
   * @param {object} account Ethereum account (default account[0])
   * @param {string} arbitratorAddress The address of the arbitrator contract
   * @param {object} seller Seller Ethereum account
   * @param {number} value funds to be placed in contract
   * @param {number} timeout Time (seconds) after which a party automatically loose a dispute. (default 3600)
   * @param {bytes} arbitratorExtraData Extra data for the arbitrator. (default empty string)
   * @param {string} metaEvidenceUri Uri meta-evidence. (default empty string)
   * @returns {object} truffle-contract Object | err The deployed contract or an error
   */
  createArbitrableTransaction = async (
    account = this._Web3Wrapper.getAccount(0),
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
          value: this._Web3Wrapper.toWei(value, 'ether'),
          gas: 800000 // FIXME gas hardcoded maybe use estimateGas before
        }
      )
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_CREATE_TRANSACTION)
    }
  }

  /**
   * Pay the party B. To be called when the good is delivered or the service rendered.
   * @param {string} account - Ethereum account (default account[0]).
   * @param {number} transactionId - The index of the transaction.
   * @param {amount} amount - Part or all of the amount of the good or the service.
   * @returns {object} - The result transaction object.
   */
  pay = async (
    account = this._Web3Wrapper.getAccount(0),
    transactionId,
    amount
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.pay(transactionId, amount, {
        from: account,
        value: 0
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_PAY_SELLER)
    }
  }

  /**
   * Reimburse the party A. To be called when the good is not delivered or the service rendered.
   * @param {string} account - Ethereum account (default account[0]).
   * @param {number} transactionId - The index of the transaction.
   * @param {amount} amount - Part or all of the amount of the good or the service.
   * @returns {object} - The result transaction object.
   */
  reimburse = async (
    account = this._Web3Wrapper.getAccount(0),
    transactionId,
    amount
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.reimburse(transactionId, amount, {
        from: account,
        value: 0
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_REIMBURSE_BUYER)
    }
  }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the party A.
   * @param {string} account - Ethereum account (default account[0]).
   * @param {number} transactionId - The index of the transaction.
   * @param {number} arbitrationCost - Arbitration cost.
   * @returns {object} - The result transaction object.
   */
  payArbitrationFeeByBuyer = async (
    account = this._Web3Wrapper.getAccount(0),
    transactionId,
    arbitrationCost
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.payArbitrationFeeByBuyer(transactionId, {
        from: account,
        value: this._Web3Wrapper.toWei(arbitrationCost, 'ether')
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_PAY_ARBITRATION_FEE)
    }
  }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the seller.
   * @param {string} account Ethereum account (default account[1]).
   * @param {number} transactionId - The index of the transaction.
   * @returns {object} - The result transaction object.
   */
  payArbitrationFeeBySeller = async (
    account = this._Web3Wrapper.getAccount(1),
    transactionId
  ) => {
    await this.loadContract()

    const transactionArbitrableData0 = await this.getData(0)

    try {
      return this.contractInstance.payArbitrationFeeBySeller(transactionId, {
        from: account,
        value: this._Web3Wrapper.toWei(
          transactionArbitrableData0.sellerFee,
          'ether'
        )
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_PAY_ARBITRATION_FEE)
    }
  }

  /**
   * Submit evidence.
   * @param {string} account ETH address of user.
   * @param {number} transactionId - The index of the transaction.
   * @param {string} url A link to an evidence using its URI.
   * @returns {string} txHash Hash transaction.
   */
  submitEvidence = async (
    account = this._Web3Wrapper.getAccount(0),
    transactionId,
    url
  ) => {
    await this.loadContract()

    const txHashObj = await this.contractInstance.submitEvidence(
      transactionId,
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
   * @param {number} transactionId - The index of the transaction.
   * @returns {object} The result transaction object.
   */
  callTimeOutBuyer = async (
    account = this._Web3Wrapper.getAccount(0),
    transactionId
  ) => {
    await this.loadContract()

    const transactionArbitrableData = await this.getData(transactionId)

    const status = transactionArbitrableData.status
    const timeout = transactionArbitrableData.timeout
    const lastInteraction = transactionArbitrableData.lastInteraction

    if (status !== contractConstants.STATUS.WAITING_SELLER) {
      throw new Error(errorConstants.CONTRACT_IS_NOT_WAITING_ON_OTHER_PARTY)
    } else if (Math.trunc(Date.now() / 1000) <= lastInteraction + timeout) {
      throw new Error(errorConstants.TIMEOUT_NOT_REACHED)
    }

    try {
      return this.contractInstance.timeOutByBuyer(transactionId, {
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
   * @param {number} transactionId - The index of the transaction.
   * @param {string} contractAddress - ETH address of contract.
   * @returns {object} The result transaction object.
   */
  callTimeOutSeller = async (
    account = this._Web3Wrapper.getAccount(1),
    transactionId
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
      return this.contractInstance.timeOutBySeller(transactionId, {
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
   * @param {string} account Ethereum account (default account[0]).
   * @param {number} transactionId - The index of the transaction.
   * @param {bytes} extraData for the arbitrator appeal procedure.
   * @param {number} appealCost Amount to pay the arbitrator. (default 0.35 ether).
   * @returns {object} - The result transaction object.
   */
  appeal = async (
    account = this._Web3Wrapper.getAccount(0),
    transactionId,
    extraData = 0x0,
    appealCost = 0.3
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.appeal(transactionId, extraData, {
        from: account,
        value: this._Web3Wrapper.toWei(appealCost, 'ether')
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_RAISE_AN_APPEAL)
    }
  }

  /**
   * Data of the contract
   * @param {number} transactionId - The index of the transaction.
   * @returns {object} Object Data of the contract.
   */
  getData = async transactionId => {
    await this.loadContract()

    const transaction = await this.contractInstance.transactions(transactionId)

    return {
      seller: transaction[0],
      buyer: transaction[1],
      amount: transaction[2].toNumber(),
      timeout: transaction[3].toNumber(),
      disputeId: transaction[4].toNumber(),
      arbitrator: transaction[5],
      arbitratorExtraData: transaction[6],
      sellerFee: this._Web3Wrapper.fromWei(transaction[7], 'ether'),
      buyerFee: this._Web3Wrapper.fromWei(transaction[8], 'ether'),
      lastInteraction: transaction[9].toNumber(),
      status: transaction[10].toNumber()
    }
  }
}

export default MultipleArbitrableTransaction
