import * as _ from 'lodash'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import ArbitrableTransactionWrapper from './ArbitrableTransactionWrapper'
import kleros from 'kleros/build/contracts/KlerosPOC'
import config from '../../config'
import disputes from './mockDisputes'
import { VOTING_PERIOD, DISPUTE_STATE_INDEX } from '../../constants'

/**
 * Kleros API
 */
class KlerosWrapper extends ContractWrapper {
  /**
   * Constructor Kleros.
   * @param {object} web3 instance
   * @param {string} address of the contract (optionnal)
   */
  constructor(web3Provider, address) {
    super(web3Provider)
    if (!_.isUndefined(address)) {
      this.address = address
    }
    this.contractInstance = null
  }

  /**
   * Kleros deploy.
   * @param {string} rngAddress address of random number generator contract
   * @param {string} pnkAddress address of pinakion contract
   * @param {number[]} timesPerPeriod array of 5 ints indicating the time limit for each period of contract
   * @param {string} account address of user
   * @param {number} value (default: 10000)
   * @return {object} truffle-contract Object | err The contract object or error deploy
   */
  deploy = async (
      rngAddress,
      pnkAddress,
      timesPerPeriod = [1,1,1,1,1],
      account = this._Web3Wrapper.getAccount(0),
      value = config.VALUE,
    ) => {

    const contractDeployed = await this._deployAsync(
      account,
      value,
      kleros,
      pnkAddress,
      rngAddress,
      timesPerPeriod
    )

    this.address = contractDeployed.address

    return contractDeployed
  }

  /**
   * Load an existing contract
   * @param {string} address contract address
   * @return {object} Conract Instance | Error
   */
  load = async (
    address
  ) => {
    // return contract instance if already loaded
    if (this.contractInstance && this.contractInstance.address === address) return this.contractInstance

    try {
      // instantiate new contract instance from address
      const contractInstance = await this._instantiateContractIfExistsAsync(kleros, address)
      this.contractInstance = contractInstance
      this.address = address

      return contractInstance
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * Use Arbitrator.buyPNK
   * @param {string} amount number of pinakion to buy
   * @param {string} contractAddress address of klerosPOC contract
   * @param {string} account address of user
   * @return {object} txHash
   */
  buyPNK = async (
    amount,
    contractAddress, // address of KlerosPOC
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    const contractInstance = await this.load(contractAddress)
    try {
      const txHashObj = await this.contractInstance.buyPinakion(
        {
          from: account,
          gas: config.GAS,
          value: this._Web3Wrapper.toWei(amount, 'ether'),
        }
      )
      return txHashObj.tx
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * @param {string} contractAddress address of KlerosPOC contract
   * @param {string} account address of user
   * @return {object} balance information including total PNK balance and activated tokens
   */
  getPNKBalance = async (
    contractAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    const contractInstance = await this.load(contractAddress)

    const juror = await contractInstance.jurors(account)
    if (!juror) throw new Error(`${account} is not a juror for contract ${contractAddress}`)

    // total tokens stored in contract
    const contractBalance = this._Web3Wrapper.fromWei(juror[0].toNumber(), 'ether')
    // tokens activated in court session
    const currentSession = await contractInstance.session.call()
    let activatedTokens = 0
    if (juror[2].toNumber() === currentSession.toNumber()) {
      activatedTokens = this._Web3Wrapper.fromWei((juror[4].toNumber() - juror[3].toNumber()), 'ether')
    }
    // tokens locked into disputes
    const lockedTokens = this._Web3Wrapper.fromWei(juror[2].toNumber(), 'ether')

    return {
      activatedTokens,
      lockedTokens,
      tokenBalance: contractBalance
    }
  }

  /**
   * Activate Pinakion tokens to be eligible to be a juror
   * @param {string} amount number of tokens to activate
   * @param {string} contractAddress address of KlerosPOC contract
   * @param {string} account address of user
   * @return {object} PNK balance
   */
  activatePNK = async (
    amount, // amount in ether
    contractAddress, // klerosPOC contract address
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    const contractInstance = await this.load(contractAddress)
    try {
      await this.contractInstance.activateTokens(
        this._Web3Wrapper.toWei(amount, 'ether'),
        {
          from: account,
          gas: config.GAS
        }
      )
    } catch (e) {
      throw new Error(e)
    }

    return this.getPNKBalance(
      contractAddress,
      account
    )
  }

  /**
  * Fetch the cost of arbitration
  * @param {string} contractAddress address of kleros POC contract
  * @param {bytes} contractExtraData extra data from arbitrable contract
  * @return {number} cost of arbitration
  */
  getArbitrationCost = async (
    contractAddress,
    contractExtraData
  ) => {
    const contractInstance = await this.load(contractAddress)

    try {
      const arbitrationCost = await contractInstance.arbitrationCost(contractExtraData)

      return arbitrationCost.toNumber()
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * Call contract to move on to the next period
   * @param {string} contractAddress address of KlerosPOC contract
   * @param {string} account address of user
   * @return {object} data for kleros POC
   */
  passPeriod = async (
    contractAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    const contractInstance = await this.load(contractAddress)
    try {
      await contractInstance.passPeriod(
        {
          from: account,
          gas: config.GAS
        }
      )
    } catch (e) {
      throw new Error(e)
    }

    return this.getData(contractAddress)
  }

  /**
   * Submit votes. Note can only be called during Voting period (Period 2)
   * @param {string} contractAddress address of KlerosPOC contract
   * @param {number} disputeId index of the dispute
   * @param {number} ruling int representing the jurors decision
   * @param {number[]} votes int[] of drawn votes for dispute
   * @param {string} account address of user
   * @return {string} tx hash
   */
  submitVotes = async (
    contractAddress,
    disputeId,
    ruling,
    votes,
    hash,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    const contractInstance = await this.load(contractAddress)

    try {
      const txHashObj = await contractInstance.voteRuling(
        disputeId,
        ruling,
        votes,
        {
          from: account,
          gas: config.GAS
        }
      )

      return txHashObj.tx
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * Appeal ruling on dispute
   * @param {string} contractAddress address of KlerosPOC contract
   * @param {number} disputeId index of the dispute
   * @param {string} account address of user
   * @return {string} tx hash 
   */
  appealRuling = async (
    contractAddress,
    disputeId,
    extraData,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    const contractInstance = await this.load(contractAddress)
    const appealFee = await contractInstance.appealCost(disputeId, extraData)
    try {
      const appealTxHash = await this.contractInstance.appeal(
        disputeId,
        extraData,
        {
          from: account,
          value: appealFee,
          gas: config.GAS
        }
      )

      return appealTxHash.tx
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * Repartition juror tokens
   * @param {string} contractAddress address of KlerosPOC contract
   * @param {number} disputeId index of the dispute
   * @param {string} account address of user
   * @return {string} tx hash
   */
  repartitionJurorTokens = async (
    contractAddress,
    disputeId,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    const contractInstance = await this.load(contractAddress)
    try {
      // partition tokens
      const repartitionTxHash = await contractInstance.oneShotTokenRepartition(
        disputeId,
        {
          from: account,
          gas: config.GAS
        }
      )

      return repartitionTxHash.tx
    } catch (e) {
      throw e
    }
  }

  /**
   * Execute ruling on dispute
   * @param {string} contractAddress address of KlerosPOC contract
   * @param {number} disputeId index of the dispute
   * @param {string} account address of user
   * @return {string} tx hash
   */
  executeRuling = async (
    contractAddress,
    disputeId,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    const contractInstance = await this.load(contractAddress)
    try {
      // execute ruling
      const executeTxHash = await this.contractInstance.executeRuling(
        disputeId,
        {
          from: account,
          gas: config.GAS
        }
      )

      return executeTxHash.tx
    } catch (e) {
      throw e
    }
  }

  /**
  * Get time for a period
  * @param {string} contractAddress address of KlerosPOC contract
  * @param {number} periodNumber int representing period
  * @return {number} seconds in the period
  */
  getTimeForPeriod = async (
    contractAddress,
    periodNumber
  ) => {
    const contractInstance = await this.load(contractAddress)

    const timePerPeriod = await contractInstance.timePerPeriod(periodNumber)

    if (timePerPeriod) {
      return timePerPeriod.toNumber()
    } else {
      throw new Error(`Period ${periodNumber} does not have a time associated with it. periodNumber out of range`)
    }
  }

  /**
  * Get dispute
  * @param {string} contractAddress address of KlerosPOC contract
  * @param {number} disputeId index of dispute
  * @return {object} dispute data from contract
  */
  getDispute = async (
    contractAddress,
    disputeId
  ) => {
    const contractInstance = await this.load(contractAddress)
    try {
      const dispute = await contractInstance.disputes(disputeId)
      return {
        arbitratedContract: dispute[0],
        firstSession: dispute[1].toNumber(),
        numberOfAppeals: dispute[2].toNumber(),
        rulingChoices: dispute[3].toNumber(),
        initialNumberJurors: dispute[4].toNumber(),
        arbitrationFeePerJuror: dispute[5].toNumber(),
        state: dispute[6].toNumber()
      }
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
  * Get number of jurors for a dispute
  * @param {string} contractAddress address of KlerosPOC contract
  * @param {number} disputeId index of dispute
  * @return {number} number of jurors for a dispute
  */
  getAmountOfJurorsForDispute = async (
    contractAddress,
    disputeId
  ) => {
    const contractInstance = await this.load(contractAddress)

    const amountOfJurors = await contractInstance.amountJurors(disputeId)

    if (amountOfJurors) {
      return amountOfJurors.toNumber()
    } else {
      throw new Error(`Dispute ${disputeId} does not exist`)
    }
  }

  /**
  * Get number of jurors for a dispute
  * @param {number} disputeId index of dispute
  * @param {number} draw int for draw
  * @param {string} contractAddress address of KlerosPOC contract
  * @param {string} jurorAddress address of juror
  * @return {bool} true indicates juror has a vote for draw, false indicates they do not
  */
  isJurorDrawnForDispute = async (
    disputeId,
    draw,
    contractAddress,
    jurorAddress = this._Web3Wrapper.getAccount(0)
  ) => {
    const contractInstance = await this.load(contractAddress)

    const isDrawn = await contractInstance.isDrawn(disputeId, jurorAddress, draw)

    return isDrawn
  }

  /**
  * Get number of jurors for a dispute
  * @param {number} disputeId index of dispute
  * @param {string} contractAddress address of KlerosPOC contract
  * @return {number} int indicating the ruling of the dispute
  */
  currentRulingForDispute = async (
    disputeId,
    contractAddress,
  ) => {
    const contractInstance = await this.load(contractAddress)

    const currentRuling = await contractInstance.currentRuling(disputeId)

    return currentRuling.toNumber()
  }

  /**
   * Get data from Kleros contract
   * TODO split these into their own methods for more flexability and speed
   * @param {string} contractAddress address of KlerosPOC contract
   * @param {string} account address of user
   * @return {object} data for kleros POC from contract
   */
  getData = async (
    contractAddress
  ) => {
    const contractInstance = await this.load(contractAddress)

    const [
      pinakionContractAddress,
      rngContractAddress,
      period,
      session,
      lastPeriodChange
    ] = await Promise.all([
      contractInstance.pinakion(),
      contractInstance.rng(),
      contractInstance.period(),
      contractInstance.session(),
      contractInstance.lastPeriodChange(),
    ]).catch(err => {
      throw new Error(err)
    })

    return {
      pinakionContractAddress,
      rngContractAddress,
      period: period.toNumber(),
      session: session.toNumber(),
      lastPeriodChange: lastPeriodChange.toNumber(),
    }
  }
}

export default KlerosWrapper
