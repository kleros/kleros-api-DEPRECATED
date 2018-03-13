import arbitrableTransaction from 'kleros-interaction/build/contracts/ArbitrableTransaction'
import _ from 'lodash'

import * as ethConstants from '../constants/eth'
import * as contractConstants from '../constants/contract'

import ContractWrapper from './ContractWrapper'

/**
 * ArbitrableTransaction API
 */
class ArbitrableTransactionWrapper extends ContractWrapper {
  /**
   * Constructor ArbitrableTransaction.
   * @param {object} web3Provider instance
   * @param {string} address of the contract (optional)
   */
  constructor(web3Provider, address) {
    super(web3Provider)
    if (!_.isUndefined(address)) {
      this.address = address
    }
    this.contractInstance = null
  }

  /**
   * Deploy ArbitrableTransaction.
   * @param {object} account Ethereum account (default account[0])
   * @param {number} value funds to be placed in contract
   * @param {string} hashContract Keccak hash of the plain English contract. (default null hashed)
   * @param {string} arbitratorAddress The address of the arbitrator contract
   * @param {number} timeout Time after which a party automatically loose a dispute. (default 3600)
   * @param {string} partyB The recipient of the transaction. (default account[1])
   * @param {bytes} arbitratorExtraData Extra data for the arbitrator. (default empty string)
   * @returns {object} truffle-contract Object | err The deployed contract or an error
   */
  deploy = async (
    account,
    value = ethConstants.TRANSACTION.VALUE,
    hashContract,
    arbitratorAddress,
    timeout,
    partyB,
    arbitratorExtraData = ''
  ) => {
    const contractDeployed = await this._deployAsync(
      account,
      value,
      arbitrableTransaction,
      arbitratorAddress,
      hashContract,
      timeout,
      partyB,
      arbitratorExtraData
    )

    this.address = contractDeployed.address
    this.contractInstance = contractDeployed

    return contractDeployed
  }

  /**
   * Load an existing arbitrableTransaction contract
   * @param {string} address Contract address
   * @returns {object} contractInstance | Error
   */
  load = async address => {
    // return contract instance if already loaded
    if (this.contractInstance && this.contractInstance.address === address)
      return this.contractInstance

    try {
      const contractInstance = await this._instantiateContractIfExistsAsync(
        arbitrableTransaction,
        address
      )

      this.contractInstance = contractInstance
      this.address = address

      return contractInstance
    } catch (err) {
      throw new Error(err)
    }
  }

  /**
   * Pay the party B. To be called when the good is delivered or the service rendered.
   * @param {string} account - Ethereum account (default account[0]).
   * @param {string} contractAddress - The address of the arbitrator contract.
   * @returns {string} - txHash hash transaction | Error
   */
  pay = async (
    account = this._Web3Wrapper.getAccount(0),
    contractAddress // ethereum address of the contract
  ) => {
    try {
      this.contractInstance = await this.load(contractAddress)
      const txHashObj = await this.contractInstance.pay({
        from: account,
        gas: ethConstants.TRANSACTION.GAS,
        value: 0
      })

      return txHashObj.tx
    } catch (err) {
      throw new Error(err)
    }
  }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the party A.
   * @param {string} account - Ethereum account (default account[0]).
   * @param {string} contractAddress - The address of the arbitrator contract.
   * @param {number} arbitrationCost - Amount to pay the arbitrator. (default 10000 wei).
   * @returns {string} - txHash hash transaction | Error.
   */
  payArbitrationFeeByPartyA = async (
    account = this._Web3Wrapper.getAccount(0),
    contractAddress, // ethereum address of the contract
    arbitrationCost = 0.15
  ) => {
    try {
      this.contractInstance = await this.load(contractAddress)
      const txHashObj = await this.contractInstance.payArbitrationFeeByPartyA({
        from: account,
        gas: ethConstants.TRANSACTION.GAS,
        value: this._Web3Wrapper.toWei(arbitrationCost, 'ether')
      })
      const data = await this.getData(contractAddress)
      return txHashObj.tx
    } catch (err) {
      throw new Error(err)
    }
  }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the party B.
   * @param {string} account Ethereum account (default account[1]).
   * @param {string} contractAddress - The address of the arbitrator contract.
   * @param {number} arbitrationCost Amount to pay the arbitrator. (default 10000 wei).
   * @returns {string} txHash hash transaction | Error.
   */
  payArbitrationFeeByPartyB = async (
    account = this._Web3Wrapper.getAccount(1),
    contractAddress, // ethereum address of the contract
    arbitrationCost = 0.15
  ) => {
    try {
      this.contractInstance = await this.load(contractAddress)
      const txHashObj = await this.contractInstance.payArbitrationFeeByPartyB({
        from: account,
        gas: ethConstants.TRANSACTION.GAS,
        value: this._Web3Wrapper.toWei(arbitrationCost, 'ether')
      })

      return txHashObj.tx
    } catch (err) {
      throw new Error(err)
    }
  }

  /**
   * Submit evidence.
   * @param {string} account ETH address of user.
   * @param {string} contractAddress ETH address of contract.
   * @param {string} name name of evidence.
   * @param {string} description description of evidence.
   * @param {string} url A link to an evidence using its URI.
   * @returns {string} txHash Hash transaction.
   */
  submitEvidence = async (
    account = this._Web3Wrapper.getAccount(0),
    contractAddress,
    name,
    description = '',
    url
  ) => {
    this.contractInstance = await this.load(contractAddress)
    const txHashObj = await this.contractInstance.submitEvidence(
      JSON.stringify(name, description, url),
      {
        from: account,
        gas: ethConstants.TRANSACTION.GAS,
        value: 0
      }
    )

    return txHashObj.tx
  }

  /**
   * Call by partyA if partyB is timeout
   * @param {string} account ETH address of user
   * @param {string} contractAddress ETH address of contract
   * @returns {string} txHash Hash transaction
   */
  callTimeOutPartyA = async (
    account = this._Web3Wrapper.getAccount(0),
    contractAddress
  ) => {
    try {
      this.contractInstance = await this.load(contractAddress)

      const status = (await this.contractInstance.status()).toNumber()
      const timeout = (await this.contractInstance.timeout()).toNumber()
      const lastInteraction = (await this.contractInstance.lastInteraction()).toNumber()
      if (status !== contractConstants.STATUS.WAITING_PARTY_B) {
        throw new Error('Status contract is not WAITING_PARTY_B')
      }

      if (Date.now() >= lastInteraction + timeout) {
        throw new Error('The timeout is not reached')
      }

      const txHashObj = await this.contractInstance.timeOutByPartyA({
        from: account,
        gas: ethConstants.TRANSACTION.GAS,
        value: 0
      })

      return txHashObj.tx
    } catch (err) {
      throw new Error(err)
    }
  }

  /**
   * Call by partyB if partyA is timeout.
   * @param {string} account - ETH address of user.
   * @param {string} contractAddress - ETH address of contract.
   * @returns {string} - txHash Hash transaction.
   */
  callTimeOutPartyB = async (
    account = this._Web3Wrapper.getAccount(1),
    contractAddress
  ) => {
    try {
      this.contractInstance = await this.load(contractAddress)

      const status = await this.contractInstance.status()
      const timeout = await this.contractInstance.timeout()
      const lastInteraction = await this.contractInstance.lastInteraction()

      if (status !== contractConstants.STATUS.WAITING_PARTY_A) {
        throw new Error('Status contract is not WAITING_PARTY_A')
      }

      if (Date.now() >= lastInteraction + timeout) {
        throw new Error('The timeout is not reached')
      }

      const txHashObj = await this.contractInstance.timeOutByPartyB({
        from: account,
        gas: ethConstants.TRANSACTION.GAS,
        value: 0
      })

      return txHashObj.tx
    } catch (err) {
      throw new Error(err)
    }
  }

  /**
   * Get ruling options from dispute via event
   * FIXME this can be an abstract method as it is in the standard
   * @param {string} arbitrableContractAddress address of the arbitrable contract
   * @param {string} arbitratorAddress address of arbitrator contract
   * @param {number} disputeId index of dispute
   * @returns {object[]} an array of objects that specify the name and value of the resolution option
   */
  getRulingOptions = async (
    arbitrableContractAddress,
    arbitratorAddress,
    disputeId
  ) => {
    const contractInstance = await this.load(arbitrableContractAddress)

    // fetch dispute resolution options
    const statusNumber = (await contractInstance.status()).toNumber()

    // should this just be !== ?
    if (statusNumber < contractConstants.STATUS.DISPUTE_CREATED) return []

    // FIXME we should have a block number to start from so we don't have to rip through the entire chain
    const disputeEvents = await new Promise((resolve, reject) => {
      contractInstance
        .Dispute({}, { fromBlock: 0, toBlock: 'latest' })
        .get((error, eventResult) => {
          if (error) reject(error)

          resolve(eventResult)
        })
    })

    const disputeOption = _.filter(disputeEvents, event => {
      const optionDisputeId = event.args._disputeID.toNumber()
      // filter by arbitrator address and disputeId
      return (
        event.args._arbitrator === arbitratorAddress &&
        optionDisputeId === disputeId
      )
    })
    // should only be 1 at this point
    if (disputeOption.length !== 1) return []

    const rulingOptions = disputeOption[0].args._rulingOptions.split(';')
    let optionIndex = 0
    const resolutionOptions = rulingOptions.map(option => {
      optionIndex += 1
      return {
        name: option,
        value: optionIndex
      }
    })

    return resolutionOptions
  }

  /**
   * Data of the contract
   * @param {string} address Address of the ArbitrableTransaction contract.
   * @returns {object} Object Data of the contract.
   */
  getData = async address => {
    const contractInstance = await this.load(address)

    const [
      arbitrator,
      extraData,
      timeout,
      partyA,
      partyB,
      status,
      arbitratorExtraData,
      disputeId,
      partyAFee,
      partyBFee,
      lastInteraction,
      amount
    ] = await Promise.all([
      contractInstance.arbitrator(),
      contractInstance.arbitratorExtraData(),
      //  contractInstance.hashContract(),
      contractInstance.timeout(),
      contractInstance.partyA(),
      contractInstance.partyB(),
      contractInstance.status(),
      contractInstance.arbitratorExtraData(),
      contractInstance.disputeID(),
      contractInstance.partyAFee(),
      contractInstance.partyBFee(),
      contractInstance.lastInteraction(),
      contractInstance.amount()
    ]).catch(err => {
      throw new Error(err)
    })

    return {
      address,
      arbitrator,
      extraData,
      timeout: timeout.toNumber(),
      partyA,
      partyB,
      status: status.toNumber(),
      arbitratorExtraData,
      disputeId: disputeId.toNumber(),
      partyAFee: this._Web3Wrapper.fromWei(partyAFee, 'ether'),
      partyBFee: this._Web3Wrapper.fromWei(partyBFee, 'ether'),
      lastInteraction: lastInteraction.toNumber(),
      amount: amount.toNumber()
    }
  }
}

export default ArbitrableTransactionWrapper
