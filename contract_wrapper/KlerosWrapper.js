import * as _ from 'lodash'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import ArbitrableTransactionWrapper from './ArbitrableTransactionWrapper'
import kleros from 'kleros/build/contracts/KlerosPOC' // FIXME mock
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
  constructor(web3Provider, storeProvider, address) {
    super(web3Provider, storeProvider)
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
   * Get disputes for user with extra data from arbitrated transaction and store
   * @param contractAddress address of Kleros contract
   * @param account address of user
   * @return objects[]
   */
  getDisputesForUser = async (
    contractAddress,
    account = this._Web3Wrapper.getAccount(0),
  ) => {
    // contract instance
    const contractInstance = await this.load(contractAddress)

    // fetch user profile
    let profile = await this._StoreProvider.getUserProfile(account)
    if (_.isNull(profile)) profile = await this._StoreProvider.newUserProfile(account)
    // fetch current contract period
    const period = (await contractInstance.period()).toNumber()
    const currentSession = (await contractInstance.session()).toNumber()
    // new jurors have not been chosen yet. don't update
    if (period !== VOTING_PERIOD) {
      let disputes = await this._StoreProvider.getDisputesForUser(account)
      disputes = await Promise.all(disputes.map(async (dispute) => {
        // get dispute from store so that we have the same object returned for both methods
        // FIXME inefficient
        dispute = await this.getDisputeByHash(dispute.hash, contractAddress)
        dispute.period = period
        dispute.session = currentSession
        return dispute
      }))

      return disputes
    }

    if (currentSession != profile.session) {
      // get disputes for juror
      const myDisputes = await this.getDisputesForJuror(contractAddress, account)

      // FIXME allow for other contract types
      const ArbitrableTransaction = new ArbitrableTransactionWrapper(this._Web3Wrapper, this._StoreProvider)

      const newDisputes = await Promise.all(myDisputes.map(async dispute => {
        // get data for contract
        const contractData = await ArbitrableTransaction.getDataContractForDispute(
          dispute.partyA,
          dispute.arbitrated,
          dispute
        )
        // compute end date
        const startTime = (await contractInstance.lastPeriodChange()).toNumber()
        const length = (await contractInstance.timePerPeriod(period)).toNumber()

        // FIXME this is all UTC for now. Timezones are a pain
        const deadline = new Date(0);
        deadline.setUTCSeconds(startTime)
        deadline.setSeconds(deadline.getSeconds() + length);

        // set deadline
        contractData.deadline = `${deadline.getUTCDate()}/${deadline.getUTCMonth()}/${deadline.getFullYear()}`

        return contractData
      }))

      let disputeObject
      for (let i=0; i<newDisputes.length; i++) {
        disputeObject = newDisputes[i]

        // update dispute
        await this._StoreProvider.updateDispute(
          disputeObject.disputeId,
          disputeObject.hash,
          disputeObject.contractAddress,
          disputeObject.partyA,
          disputeObject.partyB,
          disputeObject.title,
          disputeObject.deadline,
          disputeObject.status,
          disputeObject.fee,
          disputeObject.information,
          disputeObject.justification,
          disputeObject.resolutionOptions
        )

        // update profile
        await this._StoreProvider.updateDisputeProfile(
          account,
          disputeObject.votes,
          disputeObject.hash,
          true,
          false
        )
      }

      // update session on profile
      profile = await this._StoreProvider.getUserProfile(account)
      profile.session = currentSession
      await this._StoreProvider.updateUserProfile(account, profile)
    }

    // fetch user profile again after updates
    let disputes = await this._StoreProvider.getDisputesForUser(account)
    // add on data about period and session
    disputes = await Promise.all(disputes.map(async (dispute) => {
      // get dispute from store so that we have the same object returned for both methods
      // FIXME inefficient
      dispute = await this.getDisputeByHash(dispute.hash, contractAddress)
      dispute.period = period
      dispute.session = currentSession
      return dispute
    }))
    return disputes
  }

  /**
   * Get disputes from Kleros contract
   * @param contractAddress address of Kleros contract
   * @param account address of user
   * @return objects[]
   */
  getDisputesForJuror = async (
    contractAddress,
    account,
  ) => {
    const contractInstance = await this.load(contractAddress)
    const myDisputes = []
    let disputeId = 0
    let numberOfJurors = 0
    const currentSession = (await contractInstance.session()).toNumber()

    // iterate over all disputes (FIXME inefficient)
    let dispute = await contractInstance.disputes(disputeId)
    while (dispute[0] !== "0x") {
      // session + number of appeals
      const disputeSession = dispute[1].toNumber() + dispute[2].toNumber()
      // if dispute not in current session skip
      if (disputeSession !== currentSession) {
        disputeId++
        dispute = await contractInstance.disputes(disputeId)
        continue
      }

      numberOfJurors = (await contractInstance.amountJurors(disputeId)).toNumber()
      for (let draw=1; draw<=numberOfJurors; draw++) {
        // check if you are juror for dispute
        const isJuror = await contractInstance.isDrawn(disputeId, account, draw)
        if (isJuror) {
          let toAdd = true
          // if dispute already in myDipsutes add new draw number
          myDisputes.map((disputeObject) => {
            if (disputeObject.id === disputeId) {
              disputeObject.votes.push(draw)
              toAdd = false
            }
          })

          // if dispute not already in array add it
          if (toAdd) myDisputes.push({
            id: disputeId,
            arbitrated: dispute[0],
            session: dispute[1].toNumber(),
            appeals: dispute[2].toNumber(),
            choices: dispute[3].toNumber(),
            initialNumberJurors: dispute[4].toNumber(),
            arbitrationFeePerJuror: dispute[5].toNumber(),
            votes: [draw]
          })
        }
      }

      // check next dispute
      disputeId += 1
      dispute = await contractInstance.disputes(disputeId)
    }

    return myDisputes
  }

  /**
   * Get all contracts TODO do we need to get contract data from blockchain?
   * @param account address of user
   * @return objects[]
   */
  getContractsForUser = async (
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    // fetch user profile
    let userProfile = await this._StoreProvider.getUserProfile(account)
    if (_.isNull(userProfile)) userProfile = await this._StoreProvider.newUserProfile(account)

    return userProfile.contracts
  }

  /**
   * Get dispute by id FIXME isn't calling blockchain
   * @param disputeHash hash of the dispute
   * @param account address of user
   * @return objects[]
   */
  getDisputeByHash = async (
    disputeHash,
    contractAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    const contractInstance = await this.load(contractAddress)
    // fetch dispute
    const disputeData = await this._StoreProvider.getDisputeData(account, disputeHash)
    if (!disputeData) throw new Error(`No dispute with hash ${disputeHash} for account ${account}`)
    if (disputeData.disputeId) {
      disputeData.ruling = (await contractInstance.currentRuling(disputeData.disputeId)).toNumber()
      const disputeRaw = await contractInstance.disputes(disputeData.disputeId)
      disputeData.state = disputeRaw[DISPUTE_STATE_INDEX].toNumber()
    } else {
      // 0 indicates that there is no decision
      disputeData.ruling = 0
    }

    // get contract data from partyA (should have same docs for both parties)
    const ArbitrableTransaction = new ArbitrableTransactionWrapper(this._Web3Wrapper, this._StoreProvider)
    let contractData = await ArbitrableTransaction.getDataContract(disputeData.contractAddress)

    return {
      contractData,
      disputeData
    }
  }

  /**
   * @param amount number of pinakion to buy
   * @param account address of user
   * @return objects[]
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
    } catch (e) {
      throw new Error(e)
    }
    // update store so user can get instantaneous feedback
    let userProfile = await this._StoreProvider.getUserProfile(account)
    if (_.isNull(userProfile)) userProfile = await this._StoreProvider.newUserProfile(account)
    // FIXME seems like a super hacky way to update store
    userProfile.balance = (parseInt(userProfile.balance) ? userProfile.balance : 0) + parseInt(amount)
    delete userProfile._id
    delete userProfile.created_at
    const response = await this._StoreProvider.newUserProfile(account, userProfile)

    return this.getPNKBalance(contractAddress, account)
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

      // mark in store that you have ruled on dispute
      await this._StoreProvider.updateDisputeProfile(
        account,
        votes,
        hash,
        true,
        true
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
   * Get data from Kleros contract
   * @param contractAddress address of KlerosPOC contract
   * @param account address of user
   * @return object
   */
  getData = async (
    contractAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    let contractInstance = await this.load(contractAddress)

    const [
      pinakion,
      rng,
      period,
      session
    ] = await Promise.all([
      contractInstance.pinakion(),
      contractInstance.rng(),
      contractInstance.period(),
      contractInstance.session()
    ]).catch(err => {
      throw new Error(err)
    })

    return {
      pinakion,
      rng,
      period: period.toNumber(),
      session: session.toNumber()
    }
  }
}

export default KlerosWrapper
