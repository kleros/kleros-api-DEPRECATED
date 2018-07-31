import klerosArtifact from 'kleros/build/contracts/Kleros'
import _ from 'lodash'

import MiniMePinakion from '../PNK/MiniMePinakion'
import * as ethConstants from '../../../constants/eth'
import * as errorConstants from '../../../constants/error'
import * as arbitratorConstants from '../../../constants/arbitrator'
import ContractImplementation from '../../ContractImplementation'
import deployContractAsync from '../../../utils/deployContractAsync'
import EventListener from '../../../utils/EventListener'

/**
 * Provides interaction with a Kleros contract on the blockchain.
 */
class Kleros extends ContractImplementation {
  /**
   * Create new Kleros Implementation.
   * @param {object} web3Provider - web3 instance.
   * @param {string} contractAddress - Address of the Kleros contract.
   */
  constructor(web3Provider, contractAddress, artifact = klerosArtifact) {
    super(web3Provider, artifact, contractAddress)
  }

  /**
   * STATIC: Deploy a Kleros contract on the blockchain.
   * @param {string} rngAddress address of random number generator contract
   * @param {string} pnkAddress address of pinakion contract
   * @param {number[]} timesPerPeriod array of 5 ints indicating the time limit for each period of contract
   * @param {string} account address of user
   * @param {number} value amout of eth to send to contract
   * @param {object} web3Provider web3 provider object NOTE: NOT Kleros Web3Wrapper
   * @returns {object} truffle-contract Object | err The contract object or error deploy
   */
  static deploy = async (
    rngAddress,
    pnkAddress,
    timesPerPeriod = [300, 0, 300, 300, 300],
    account,
    value = ethConstants.TRANSACTION.VALUE,
    web3Provider
  ) => {
    const contractDeployed = await deployContractAsync(
      account,
      value,
      klerosArtifact,
      web3Provider,
      pnkAddress,
      rngAddress,
      timesPerPeriod
    )

    return contractDeployed
  }

  /**
   * Deposit PNK to the contract.
   * @param {number} amount - The amount of PNK to deposit.
   * @param {string} account - The address of the user.
   * @returns {object} - Balance information including total PNK balance and activated tokens.
   */
  transferPNKToArbitrator = async (amount, account = this._Web3Wrapper.getAccount(0)) => {
    await this.loadContract()

    const pinakionContractAddress = await this.contractInstance.pinakion()
    const pnkInstance = new MiniMePinakion(this.getWeb3Provider(), pinakionContractAddress)

    const deposited = await pnkInstance.approveAndCall(this.contractAddress, amount, account)
    if (!deposited)
      throw new Error('Unable to deposit PNK')

    return this.getPNKBalance(account)
  }

  /**
   * Withdraw PNK from the contract.
   * @param {number} amount - The amount of PNK to deposit.
   * @param {string} account - The address of the user.
   * @returns {object} - Balance information including total PNK balance and activated tokens.
   */
  withdrawPNK = async (amount, account = this._Web3Wrapper.getAccount(0)) => {
    await this.loadContract()
    await this.contractInstance.withdraw(
      this._Web3Wrapper.toWei(amount, 'ether'),
      {
        from: account,
      }
    )

    return this.getPNKBalance(account)
  }

  /**
   * Get PNK Balances.
   * @param {string} account - The address of the user.
   * @returns {object} - Balance information including total PNK balance and activated tokens.
   */
  getPNKBalance = async (account = this._Web3Wrapper.getAccount(0)) => {
    await this.loadContract()

    const pinakionContractAddress = await this.contractInstance.pinakion()
    const pnkInstance = new MiniMePinakion(this.getWeb3Provider(), pinakionContractAddress)

    const contractBalance = this._Web3Wrapper.fromWei(
      (await pnkInstance.getTokenBalance(account)),
      'ether'
    )

    const juror = await this.contractInstance.jurors(account)
    if (!juror)
      throw new Error(
        errorConstants.ACCOUNT_NOT_A_JUROR_FOR_CONTRACT(
          account,
          this.contractAddress
        )
      )

    // Total tokens
    const totalTokens = this._Web3Wrapper.fromWei(juror[0], 'ether')

    // Activated Tokens
    const currentSession = await this.contractInstance.session()
    let activatedTokens = 0
    if (juror[2].toNumber() === currentSession.toNumber())
      activatedTokens = this._Web3Wrapper.fromWei(
        juror[4].toNumber() - juror[3].toNumber(),
        'ether'
      )

    // Locked Tokens
    const lockedTokens = this._Web3Wrapper.fromWei(juror[1], 'ether')

    return {
      tokenBalance: totalTokens,
      activatedTokens,
      lockedTokens,
      contractBalance
    }
  }

  /**
   * Activate Pinakion tokens to be eligible to be a juror.
   * @param {string} amount - number of tokens to activate.
   * @param {string} account - address of user.
   * @returns {object} - PNK balance.
   */
  activatePNK = async (
    amount, // amount in ether
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    await this.loadContract()

    try {
      await this.contractInstance.activateTokens(
        this._Web3Wrapper.toWei(amount, 'ether'),
        {
          from: account,
        }
      )
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_ACTIVATE_PNK)
    }

    return this.getPNKBalance(account)
  }

  /**
   * Fetch the cost of arbitration.
   * @param {bytes} contractExtraData - extra data from arbitrable contract.
   * @returns {number} - The cost of arbitration.
   */
  getArbitrationCost = async contractExtraData => {
    await this.loadContract()

    try {
      const arbitrationCost = await this.contractInstance.arbitrationCost(
        contractExtraData
      )

      return this._Web3Wrapper.fromWei(arbitrationCost, 'ether')
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_FETCH_ARBITRATION_COST)
    }
  }

  /**
   * Fetch the cost of appeal.
   * @param {number} disputeId - index of the dispute.
   * @param {bytes} contractExtraData - extra data from arbitrable contract.
   * @returns {number} - The cost of appeal.
   */
  getAppealCost = async (disputeId, contractExtraData) => {
    await this.loadContract()

    try {
      const appealCost = await this.contractInstance.appealCost(
        disputeId,
        contractExtraData
      )

      return this._Web3Wrapper.fromWei(appealCost, 'ether')
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_FETCH_APPEAL_COST)
    }
  }

  /**
   * Call contract to move on to the next period.
   * @param {string} account - address of user.
   * @returns {Promise} - resulting object.
   */
  passPeriod = async (account = this._Web3Wrapper.getAccount(0)) => {
    await this.loadContract()

    try {
      await this.contractInstance.passPeriod.original({
        from: account,
      })
      return this.getData()
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_PASS_PERIOD)
    }
  }

  /**
   * Submit votes. Note can only be called during Voting period (Period 2).
   * @param {number} disputeId - index of the dispute.
   * @param {number} ruling - int representing the jurors decision.
   * @param {number[]} votes - int[] of drawn votes for dispute.
   * @param {string} account - address of user.
   * @returns {object} - The result transaction object.
   */
  submitVotes = async (
    disputeId,
    ruling,
    votes,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.voteRuling(disputeId, ruling, votes, {
        from: account,
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_SUBMIT_VOTES)
    }
  }

  /**
   * Appeal ruling on dispute.
   * @param {number} disputeId - Index of the dispute.
   * @param {string} extraData - Extra data.
   * @param {string} account - Address of user.
   * @returns {object} - The result transaction object.
   */
  appealRuling = async (
    disputeId,
    extraData,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.appeal(disputeId, extraData, {
        from: account,
        value: await this.contractInstance.appealCost(disputeId, extraData),
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_APPEAL)
    }
  }

  /**
   * Repartition juror tokens.
   * @param {number} disputeId - index of the dispute.
   * @param {string} account - address of user.
   * @returns {object} - The result transaction object.
   */
  repartitionJurorTokens = async (
    disputeId,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.oneShotTokenRepartition(disputeId, {
        from: account,
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_REPARTITION_TOKENS)
    }
  }

  /**
   * Execute ruling on dispute
   * @param {number} disputeId - index of the dispute.
   * @param {string} account - address of user.
   * @returns {object} - The result transaction object.
   */
  executeRuling = async (
    disputeId,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    await this.loadContract()

    try {
      return this.contractInstance.executeRuling(disputeId, {
        from: account,
      })
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_EXECUTE_RULING)
    }
  }

  /**
   * Get time for a period.
   * @param {number} periodNumber - int representing period.
   * @returns {number} - The seconds in the period.
   */
  getTimeForPeriod = async periodNumber => {
    await this.loadContract()

    let timePerPeriod

    try {
      timePerPeriod = await this.contractInstance.timePerPeriod(periodNumber)
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_FETCH_TIME_PER_PERIOD)
    }

    if (timePerPeriod) return timePerPeriod.toNumber()

    throw new Error(errorConstants.PERIOD_OUT_OF_RANGE(periodNumber))
  }

  /**
   * Get dispute.
   * @param {number} disputeId - The index of the dispute.
   * @returns {object} - The dispute data from the contract.
   */
  getDispute = async disputeId => {
    await this.loadContract()

    try {
      const dispute = await this.contractInstance.disputes(disputeId)
      const numberOfAppeals = dispute[2].toNumber()
      const rulingChoices = dispute[3].toNumber()

      let voteCounters = []
      let status
      for (let appeal = 0; appeal <= numberOfAppeals; appeal++) {
        const voteCounts = []
        for (let choice = 0; choice <= rulingChoices; choice++)
          voteCounts.push(
            this.contractInstance
              .getVoteCount(disputeId, appeal, choice)
              .then(v => v.toNumber())
          )
        voteCounters.push(voteCounts)
      }

      ;[voteCounters, status] = await Promise.all([
        Promise.all(voteCounters.map(voteCounts => Promise.all(voteCounts))),
        this.contractInstance.disputeStatus(disputeId)
      ])

      return {
        arbitratorAddress: this.contractAddress,
        disputeId,
        arbitrableContractAddress: dispute[0],
        firstSession: dispute[1].toNumber(),
        numberOfAppeals,
        rulingChoices,
        initialNumberJurors: dispute[4].toNumber(),
        arbitrationFeePerJuror: this._Web3Wrapper.fromWei(dispute[5], 'ether'),
        state: dispute[6].toNumber(),
        voteCounters,
        status: status.toNumber()
      }
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      // console.error(err)
      throw new Error(errorConstants.UNABLE_TO_FETCH_DISPUTE)
    }
  }

  /**
   * Get number of jurors for a dispute.
   * @param {number} disputeId - Index of dispute.
   * @returns {number} - Number of jurors for a dispute.
   */
  getAmountOfJurorsForDispute = async disputeId => {
    await this.loadContract()

    let amountOfJurors

    try {
      amountOfJurors = await this.contractInstance.amountJurors(disputeId)
    } catch (err) {
      console.error(err)
      throw new Error(errorConstants.UNABLE_TO_FETCH_AMOUNT_OF_JURORS)
    }

    if (amountOfJurors) return amountOfJurors.toNumber()

    throw new Error(errorConstants.DISPUTE_DOES_NOT_EXIST)
  }

  /**
   * Get number of jurors for a dispute.
   * @param {number} disputeId - Index of dispute.
   * @param {number} draw - Int for draw.
   * @param {string} jurorAddress - Address of juror.
   * @returns {bool} - `true` indicates juror has a vote for draw, `false` indicates they do not.
   */
  isJurorDrawnForDispute = async (
    disputeId,
    draw,
    jurorAddress = this._Web3Wrapper.getAccount(0)
  ) => {
    await this.loadContract()

    const isDrawn = await this.contractInstance.isDrawn(
      disputeId,
      jurorAddress,
      draw
    )

    return isDrawn
  }

  /**
   * Can juror currently rule in dispute.
   * @param {number} disputeId - index of dispute.
   * @param {int[]} draws - voting positions for dispute.
   * @param {string} account - address of user.
   * @returns {bool} - Boolean indicating if juror can rule or not.
   */
  canRuleDispute = async (disputeId, draws, account) => {
    await this.loadContract()

    const validDraws = await this.contractInstance.validDraws(
      account,
      disputeId,
      draws
    )

    const lastRuling = (await this.contractInstance.getLastSessionVote(
      disputeId,
      account
    )).toNumber()

    const currentSession = await this.getSession()
    const period = await this.getPeriod()
    return (
      validDraws &&
      lastRuling !== currentSession &&
      period < arbitratorConstants.PERIOD.APPEAL
    )
  }

  /**
   * Get number of jurors for a dispute.
   * @param {number} disputeId - Index of dispute.
   * @param {number} appeal - Index of appeal.
   * @returns {number} - Int indicating the ruling of the dispute.
   */
  currentRulingForDispute = async (disputeId, appeal) => {
    await this.loadContract()

    const ruling = await this.contractInstance.getWinningChoice(
      disputeId,
      appeal
    )

    return ruling.toNumber()
  }

  /**
   * Get current period of the contract
   * @returns {number} - Int indicating the period.
   */
  getPeriod = async () => {
    await this.loadContract()

    const currentPeriod = await this.contractInstance.period()

    return currentPeriod.toNumber()
  }

  /**
   * Get current session of the contract.
   * @returns {number} - Int indicating the session.
   */
  getSession = async () => {
    await this.loadContract()

    const currentSession = await this.contractInstance.session()

    return currentSession.toNumber()
  }

  /**
   * Get disputes from Kleros contract.
   * @param {string} account - Address of user.
   * @returns {object[]} - Array of disputes.
   */
  getDisputesForJuror = async account => {
    await this.loadContract()

    // contract data
    const openDisputes = await this.getOpenDisputesForSession()

    const disputes = await Promise.all(
      openDisputes.map(async disputeData => {
        const draws = await this.getDrawsForJuror(
          disputeData.disputeId,
          account
        )
        disputeData.appealDraws = disputeData.appealDraws || []
        disputeData.appealDraws[disputeData.numberOfAppeals] = draws

        return disputeData
      })
    )

    return disputes
  }

  /**
   * Fetch the votes a juror has in a dispute.
   * @param {number} disputeId - ID of the dispute.
   * @param {string} account - Potential jurors address.
   * @returns {number[]} - Array of integers indicating the draw.
   */
  getDrawsForJuror = async (disputeId, account) => {
    await this.loadContract()

    const numberOfJurors = await this.getAmountOfJurorsForDispute(disputeId)
    const draws = []
    for (let draw = 1; draw <= numberOfJurors; draw++) {
      const isJuror = await this.isJurorDrawnForDispute(
        disputeId,
        draw,
        account
      )
      if (isJuror) {
        draws.push(draw)
      }
    }
    return draws
  }

  /** Get all disputes that are active this session.
   * @returns {int[]} - array of active disputeId
   */
  getOpenDisputesForSession = async () => {
    await this.loadContract()

    const currentSession = await this.getSession()
    const openDisputes = []

    let disputeId = 0
    let dispute
    while (1) {
      // Iterate over all the disputes
      // TODO: Implement a more performant solution
      try {
        dispute = await this.getDispute(disputeId)
      } catch (err) {
        // Dispute out of range, break
        if (err.message === errorConstants.UNABLE_TO_FETCH_DISPUTE) break
        console.error(err)
        throw err
      }

      // Dispute has no arbitrable contract, break
      if (dispute.arbitrableContractAddress === ethConstants.NULL_ADDRESS) break

      // If dispute is in the current session, add it to the result array
      if (dispute.firstSession + dispute.numberOfAppeals === currentSession)
        openDisputes.push(dispute)

      // Advance to the next dispute
      disputeId++
    }

    return openDisputes
  }

  /**
   * Find when a ruling was made in a session
   * @param {number} session - The session number.
   * @returns {number[]} an array of timestamps
   */
  getAppealRuledAtTimestamp = async session => {
    const eventLog = await this._getNewPeriodEventLogForSession(
      session,
      arbitratorConstants.PERIOD.APPEAL
    )
    // May not have happened yet
    if (!eventLog) return null

    const ruledAtTimestamp = await this._getTimestampForBlock(
      eventLog.blockNumber
    )

    return ruledAtTimestamp * 1000
  }

  /**
   * Find the deadline for disputes in a session.
   * @param {number} session - The session number.
   * @returns {number[]} an array of timestamps
   */
  getDisputeDeadlineTimestamp = async session => {
    const eventLog = await this._getNewPeriodEventLogForSession(
      session,
      arbitratorConstants.PERIOD.VOTE
    )
    // May not have happened yet
    if (!eventLog) return null

    // Fetch length of Vote period
    const periodLength = await this.getTimeForPeriod(
      arbitratorConstants.PERIOD.VOTE
    )
    // Get the time that the period started
    const periodStartTimestamp = await this._getTimestampForBlock(
      eventLog.blockNumber
    )

    return (periodLength + periodStartTimestamp) * 1000
  }

  /**
   * Get the event log for an appeal creation
   * @param {number} session - The session number.
   * @returns {number[]} an array of timestamps
   */
  getAppealCreationTimestamp = async session => {
    const eventLog = await this._getNewPeriodEventLogForSession(
      session,
      arbitratorConstants.PERIOD.EXECUTE
    )

    // May not have happened yet
    if (!eventLog) return null

    const createdAtTimestamp = await this._getTimestampForBlock(
      eventLog.blockNumber
    )

    return createdAtTimestamp * 1000
  }

  /**
   * Get the event log for the dispute creation.
   * @param {number} disputeId - The block number that the dispute was created.
   * @returns {object} dispute creation event log.
   */
  getDisputeCreationEvent = async disputeId => {
    const eventLogs = await EventListener.getEventLogs(
      this,
      'DisputeCreation',
      0,
      'latest',
      { _disputeID: disputeId }
    )

    for (let i = 0; i < eventLogs.length; i++) {
      const log = eventLogs[i]

      if (log.args._disputeID.toNumber() === disputeId) return log
    }

    return null
  }

  /**
   * Get the amount of tokens won or lost by a juror for a dispute
   * @param {number} disputeId The index of the dispute
   * @param {string} account The account of the juror
   * @returns {number} The net total PNK
   */
  getNetTokensForDispute = async (disputeId, account) => {
    const eventLogs = await EventListener.getEventLogs(
      this,
      'TokenShift',
      0,
      'latest',
      { _account: account }
    )

    let netPNK = 0
    for (let i = 0; i < eventLogs.length; i++) {
      const event = eventLogs[i]
      if (event.args._disputeID.toNumber() === disputeId)
        netPNK += event.args._amount.toNumber()
    }

    return this._Web3Wrapper.fromWei(netPNK, 'ether')
  }

  /**
   * Get the timestamp from blockNumber
   * @param {number} blockNumber - The block number
   * @returns {number} timestamp
   */
  _getTimestampForBlock = async blockNumber =>
    (await this._Web3Wrapper.getBlock(blockNumber)).timestamp

  /**
   * Get event NewPeriod event logs a period in a session.
   * @param {number} session - The session number.
   * @param {number} periodNumber - The period number we want logs for.
   * @returns {object} event log object.
   */
  _getNewPeriodEventLogForSession = async (session, periodNumber) => {
    const logs = await EventListener.getEventLogs(
      this,
      'NewPeriod',
      0,
      'latest',
      { _session: [session] }
    )
    for (let i = 0; i < logs.length; i++) {
      const eventLog = logs[i]
      if (eventLog.args._period.toNumber() === periodNumber) return eventLog
    }
    // We have hit the latest event log and did not find data. Return all that we have.
    return null
  }

  /**
   * Get data from Kleros contract.
   * TODO split these into their own methods for more flexability and speed
   * @returns {object} - Data for kleros POC from contract.
   */
  getData = async () => {
    await this.loadContract()

    const [
      pinakionContractAddress,
      rngContractAddress,
      period,
      session,
      lastPeriodChange
    ] = await Promise.all([
      this.contractInstance.pinakion(),
      this.contractInstance.rng(),
      this.contractInstance.period(),
      this.contractInstance.session(),
      this.contractInstance.lastPeriodChange()
    ])

    return {
      pinakionContractAddress,
      rngContractAddress,
      period: period.toNumber(),
      session: session.toNumber(),
      lastPeriodChange: lastPeriodChange.toNumber()
    }
  }
}

export default Kleros
