import arbitrableTransactionArtifact from 'kleros-interaction/build/contracts/ArbitrableTransaction'
import _ from 'lodash'

import * as ethConstants from '../../../constants/eth'
import * as contractConstants from '../../../constants/contract'
import * as errorConstants from '../../../constants/error'
import deployContractAsync from '../../../utils/deployContractAsync'

import Arbitrable from './Arbitrable'

/**
 * Provides interaction with an Arbitrable Transaction contract deployed on the blockchain.
 */
class ArbitrableTransaction extends Arbitrable {
  /**
   * Constructor ArbitrableTransaction.
   * @param {object} web3Provider instance
   * @param {string} contractAddress of the contract
   */
  constructor(web3Provider, contractAddress) {
    super(web3Provider, arbitrableTransactionArtifact, contractAddress)
  }

  /**
   * Deploy ArbitrableTransaction.
   * @param {object} account Ethereum account
   * @param {number} value funds to be placed in contract
   * @param {string} arbitratorAddress The address of the arbitrator contract
   * @param {number} timeout Time after which a party automatically loose a dispute.
   * @param {string} partyB The recipient of the transaction.
   * @param {bytes} arbitratorExtraData Extra data for the arbitrator. (default empty string)
   * @param {string} metaEvidenceUri The uri for the metaEvidence
   * @param {object} web3Provider web3 provider object
   * @returns {object} truffle-contract Object | err The deployed contract or an error
   */
  static deploy = async (
    account,
    value = ethConstants.TRANSACTION.VALUE,
    arbitratorAddress,
    timeout,
    partyB,
    arbitratorExtraData = '',
    metaEvidenceUri,
    web3Provider
  ) => {
    const contractDeployed = await deployContractAsync(
      account,
      value,
      arbitrableTransactionArtifact,
      web3Provider,
      arbitratorAddress,
      timeout,
      partyB,
      arbitratorExtraData,
      metaEvidenceUri
    )

    return contractDeployed
  }

  /**
   * Pay the party B. To be called when the good is delivered or the service rendered.
   * @param {string} account - Ethereum address.
   * @returns {object} - The result transaction object.
   */
  pay = async account => {
    await this.loadContract()

    try {
      return this.contractInstance.pay({
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
   * @param {string} account - Ethereum address.
   * @param {number} arbitrationCost - Arbitration fee in wei.
   * @returns {object} - The result transaction object.
   */
  payArbitrationFeeByPartyA = async (account, arbitrationCost) => {
    await this.loadContract()

    try {
      return this.contractInstance.payArbitrationFeeByPartyA({
        from: account,
        value: arbitrationCost
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_PAY_ARBITRATION_FEE)
    }
  }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the party B.
   * @param {string} account Ethereum address.
   * @param {number} arbitrationCost Amount to pay the arbitrator.
   * @returns {object} - The result transaction object.
   */
  payArbitrationFeeByPartyB = async (account, arbitrationCost) => {
    await this.loadContract()

    try {
      return this.contractInstance.payArbitrationFeeByPartyB({
        from: account,
        value: arbitrationCost,
        gas: process.env.GAS || undefined
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_PAY_ARBITRATION_FEE)
    }
  }

  /**
   * Submit evidence.
   * @param {string} account ETH address of user.
   * @param {string} url A link to an evidence using its URI.
   * @returns {string} txHash Hash transaction.
   */
  submitEvidence = async (account, url) => {
    await this.loadContract()

    const txHashObj = await this.contractInstance.submitEvidence(url, {
      from: account,
      value: 0
    })

    return txHashObj.tx
  }

  /**
   * Call by partyA if partyB is timeout
   * @param {string} account ETH address of user
   * @returns {object} The result transaction object.
   */
  callTimeOutPartyA = async account => {
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
      return this.contractInstance.timeOutByPartyA({
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
   * @returns {object} The result transaction object.
   */
  callTimeOutPartyB = async account => {
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
      return this.contractInstance.timeOutByPartyB({
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
   * @param {number} appealCost Fee for the appeal
   * @param {bytes} extraData for the arbitrator appeal procedure.
   * @returns {object} - The result transaction object.
   */
  appeal = async (account, appealCost, extraData = 0x0) => {
    await this.loadContract()

    try {
      return this.contractInstance.appeal(extraData, {
        from: account,
        value: appealCost
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_RAISE_AN_APPEAL)
    }
  }

  /**
   * Fetch the parties involved in the arbitrable transaction contract.
   * @returns {object} returns a mapping of partyA and partyB to ETH addresses.
   */
  getParties = async () => {
    await this.loadContract()

    const [partyA, partyB] = await Promise.all([
      this.contractInstance.partyA(),
      this.contractInstance.partyB()
    ])

    return {
      partyA,
      partyB
    }
  }

  /**
   * Data of the contract
   * @returns {object} Object Data of the contract.
   */
  getData = async () => {
    await this.loadContract()

    const [
      arbitrator,
      extraData,
      timeout,
      partyA,
      partyB,
      status,
      arbitratorExtraData,
      disputeID,
      partyAFee,
      partyBFee,
      lastInteraction,
      amount,
      evidence,
      metaEvidence
    ] = await Promise.all([
      this.contractInstance.arbitrator(),
      this.contractInstance.arbitratorExtraData(),
      //  this.contractInstance.hashContract(),
      this.contractInstance.timeout(),
      this.contractInstance.partyA(),
      this.contractInstance.partyB(),
      this.contractInstance.status(),
      this.contractInstance.arbitratorExtraData(),
      this.contractInstance.disputeID(),
      this.contractInstance.partyAFee(),
      this.contractInstance.partyBFee(),
      this.contractInstance.lastInteraction(),
      this.contractInstance.amount(),
      this.getEvidence(),
      this.getMetaEvidence()
    ])

    return {
      address: this.getContractAddress(),
      arbitrator,
      extraData,
      timeout: timeout.toNumber(),
      partyA,
      partyB,
      status: status.toNumber(),
      arbitratorExtraData,
      disputeID: disputeID.toNumber(),
      partyAFee,
      partyBFee,
      lastInteraction: lastInteraction.toNumber(),
      amount: amount.toNumber(),
      evidence,
      metaEvidence
    }
  }
}

export default ArbitrableTransaction
