import multipleArbitrableTransactionArtifact from 'kleros-interaction/build/contracts/MultipleArbitrableTransaction'
import _ from 'lodash'

import * as ethConstants from '../../../constants/eth'
import * as contractConstants from '../../../constants/contract'
import * as errorConstants from '../../../constants/error'
import Arbitrable from './Arbitrable'
import deployContractAsync from '../../../utils/deployContractAsync'

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
   * Create MultipleArbitrableTransaction.
   * @param {object} account Ethereum account (default account[0])
   * @param {string} arbitratorAddress The address of the arbitrator contract
   * @param {number} value funds to be placed in contract
   * @param {number} timeout Time (seconds) after which a party automatically loose a dispute. (default 3600)
   * @param {bytes} arbitratorExtraData Extra data for the arbitrator. (default empty string)
   * @param {string} metaEvidenceUri Uri meta-evidence. (default empty string)
   * @returns {object} truffle-contract Object | err The deployed contract or an error
   */
  createArbitrableTransaction = async (
    account = this._Web3Wrapper.getAccount(0),
    arbitratorAddress,
    value,
    timeout = 3600,
    arbitratorExtraData = 0x0,
    metaEvidenceUri = ''
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.createTransaction(
        arbitratorAddress,
        timeout,
        account,
        arbitratorExtraData,
        metaEvidenceUri,
        {
          from: account,
          value: this._Web3Wrapper.toWei(value, 'ether')
        }
      )
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_PAY_SELLER)
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
   * Pay the arbitration fee to raise a dispute. To be called by the party A.
   * @param {string} account - Ethereum account (default account[0]).
   * @param {number} transactionId - The index of the transaction.
   * @param {number} arbitrationCost - Amount to pay the arbitrator. (default 0.15 ether).
   * @returns {object} - The result transaction object.
   */
  payArbitrationFeeByPartyA = async (
    account = this._Web3Wrapper.getAccount(0),
    transactionId,
    arbitrationCost = 0.15
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.payArbitrationFeeByPartyA(transactionId, {
        from: account,
        value: this._Web3Wrapper.toWei(arbitrationCost, 'ether')
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_PAY_ARBITRATION_FEE)
    }
  }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the party B.
   * @param {string} account Ethereum account (default account[1]).
   * @param {number} transactionId - The index of the transaction.
   * @param {number} arbitrationCost Amount to pay the arbitrator. (default 10000 wei).
   * @returns {object} - The result transaction object.
   */
  payArbitrationFeeByPartyB = async (
    account = this._Web3Wrapper.getAccount(1),
    transactionId,
    arbitrationCost = 0.15
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.payArbitrationFeeByPartyB(transactionId, {
        from: account,
        value: this._Web3Wrapper.toWei(arbitrationCost, 'ether')
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
   * Call by partyA if partyB is timeout
   * @param {string} account ETH address of user
   * @param {number} transactionId - The index of the transaction.
   * @returns {object} The result transaction object.
   */
  callTimeOutPartyA = async (
    account = this._Web3Wrapper.getAccount(0),
    transactionId
  ) => {
    await this.loadContract()

    const status = (await this.contractInstance.status()).toNumber()
    const timeout = (await this.contractInstance.timeout()).toNumber()
    const lastInteraction = (await this.contractInstance.lastInteraction()).toNumber()

    if (status !== contractConstants.STATUS.WAITING_PARTY_B) {
      throw new Error(errorConstants.CONTRACT_IS_NOT_WAITING_ON_OTHER_PARTY)
    } else if (Date.now() >= lastInteraction + timeout) {
      throw new Error(errorConstants.TIMEOUT_NOT_REACHED)
    }

    try {
      return this.contractInstance.timeOutByPartyA(transactionId, {
        from: account,
        value: 0
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_CALL_TIMEOUT)
    }
  }

  /**
   * Call by partyB if partyA is timeout.
   * @param {string} account - ETH address of user.
   * @param {number} transactionId - The index of the transaction.
   * @param {string} contractAddress - ETH address of contract.
   * @returns {object} The result transaction object.
   */
  callTimeOutPartyB = async (
    account = this._Web3Wrapper.getAccount(1),
    transactionId
  ) => {
    await this.loadContract()

    const status = await this.contractInstance.status()
    const timeout = await this.contractInstance.timeout()
    const lastInteraction = await this.contractInstance.lastInteraction()

    if (status !== contractConstants.STATUS.WAITING_PARTY_A) {
      throw new Error(errorConstants.CONTRACT_IS_NOT_WAITING_ON_OTHER_PARTY)
    } else if (Date.now() >= lastInteraction + timeout) {
      throw new Error(errorConstants.TIMEOUT_NOT_REACHED)
    }

    try {
      return this.contractInstance.timeOutByPartyB(transactionId, {
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
      arbitrator: transaction.arbitrator,
      extraData: transaction.arbitratorExtraData,
      timeout: transaction.timeout.toNumber(),
      partyA: transaction.seller,
      partyB: transaction.buyer,
      status: transaction.status.toNumber(),
      arbitratorExtraData: transaction.arbitratorExtraData,
      disputeId: transaction.disputeId.toNumber(),
      partyAFee: this._Web3Wrapper.fromWei(transaction.sellerFee, 'ether'),
      partyBFee: this._Web3Wrapper.fromWei(transaction.buyerFee, 'ether'),
      lastInteraction: transaction.lastInteraction.toNumber(),
      amount: transaction.amount.toNumber(),
    }
  }
}

export default MultipleArbitrableTransaction
