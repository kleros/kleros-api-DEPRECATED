import * as _ from 'lodash'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import ArbitrableTransactionWrapper from './ArbitrableTransactionWrapper'
import kleros from 'kleros/build/contracts/KlerosPOC'
import config from '../config'
import disputes from './mockDisputes'
import { VOTING_PERIOD, DISPUTE_STATE_INDEX } from '../constants'

/**
 * Kleros API
 */
class KlerosWrapper extends ContractWrapper {
  /**
   * Constructor Kleros.
   * @param web3 instance
   * @param address of the contract (optionnal)
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
   * @param   account (default: accounts[0])
   * @param   value (default: 10000)
   * @return  truffle-contract Object | err The contract object or error deploy
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
   * @param address contract address
   * @return Conract Instance | Error
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
   * @param amount number of pinakion to buy
   * @param account address of user
   * @return txHash
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
   * @param contractAddress address of KlerosPOC contract
   * @param account address of user
   * @return objects[]
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
   * @param amount number of tokens to activate
   * @param contractAddress address of KlerosPOC contract
   * @param account address of user
   * @return object | Error
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
   * Call contract to move on to the next period
   * @param contractAddress address of KlerosPOC contract
   * @param account address of user
   * @return object | Error
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
   * @param contractAddress address of KlerosPOC contract
   * @param disputeId index of the dispute
   * @param ruling int representing the jurors decision
   * @param votes int[] of drawn votes for dispute
   * @param account address of user
   * @return object | Error
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
   * @param contractAddress address of KlerosPOC contract
   * @param disputeId
   * @param account address of user
   * @return object
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
   * @param contractAddress address of KlerosPOC contract
   * @param disputeId
   * @param account address of user
   * @return object
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
   * @param contractAddress address of KlerosPOC contract
   * @param disputeId
   * @param account address of user
   * @return object
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
  * @param periodNumber int representing period
  * @param contractAddressaddress of KlerosPOC contract
  * @return object | Error
  */
  getTimeForPeriod = async (
    periodNumber,
    contractAddres
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
  * @param disputeId index of dispute
  * @param contractAddressaddress of KlerosPOC contract
  * @return object | Error
  */
  getDispute = async (
    disputeId,
    contractAddres
  ) => {
    const contractInstance = await this.load(contractAddress)

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
  }

  /**
  * Get number of jurors for a dispute
  * @param disputeId index of dispute
  * @param contractAddressaddress of KlerosPOC contract
  * @return object | Error
  */
  getAmountOfJurorsForDispute = async (
    disputeId,
    contractAddres
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
  * @param disputeId index of dispute
  * @param draw int for draw
  * @param contractAddressaddress of KlerosPOC contract
  * @param jurorAddress address of juror
  * @return bool | Error
  */
  isJurorDrawnForDispute = async (
    disputeId,
    draw,
    contractAddres,
    jurorAddress = this._Web3Wrapper.getAccount(0)
  ) => {
    const contractInstance = await this.load(contractAddress)

    const isDrawn = await contractInstance.isDrawn(disputeId, jurorAddress, draw)

    return isDrawn
  }

  /**
  * Get number of jurors for a dispute
  * @param disputeId index of dispute
  * @param contractAddressaddress of KlerosPOC contract
  * @return int | Error
  */
  currentRulingForDispute = async (
    disputeId,
    contractAddres,
  ) => {
    const contractInstance = await this.load(contractAddress)

    const currentRuling = await contractInstance.currentRuling(disputeId)

    return currentRuling.toNumber()
  }

  /**
   * Get data from Kleros contract
   * TODO split these into their own methods for more flexability and speed
   * @param contractAddress address of KlerosPOC contract
   * @param account address of user
   * @return object
   */
  getData = async (
    contractAddress,
    account = this._Web3Wrapper.getAccount(0)
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
