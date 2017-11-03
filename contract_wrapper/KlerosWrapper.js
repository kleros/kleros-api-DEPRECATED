import * as _ from 'lodash'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import ArbitrableTransactionWrapper from './ArbitrableTransactionWrapper'
import kleros from 'kleros/build/contracts/KlerosPOC' // FIXME mock
import config from '../config'
import disputes from './mockDisputes'

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
    try {
      const contractInstance = await this._instantiateContractIfExistsAsync(kleros, address)
      this.contractInstance = contractInstance
      this.address = address

      return contractInstance
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
  * FIXME this is a massive function. Break into smaller pieces
   * Get disputes // FIXME really could use a test
   * @param account address of user
   * @return objects[]
   */
  getDisputesForUser = async (
    contractAddress,
    account = this._Web3Wrapper.getAccount(0),
  ) => {
    // contract instance
    const contractInstance = await this.load(contractAddress)

    // user profile
    let profile = await this._StoreProvider.getUserProfile(account)
    if (_.isNull(profile)) profile = await this._StoreProvider.newUserProfile(account)

    const currentSession = (await contractInstance.session()).toNumber()
    if (currentSession != profile.session) {
      const newDisputes = []
      let disputeId = 0
      let numberOfJurors = 0
      const myDisputes = []
      let dispute = await contractInstance.disputes(disputeId)
      while (dispute[0] !== "0x") {
        // if dispute not in current session skip
        const disputeSession = dispute[1].toNumber()
        if (disputeSession !== currentSession) {
          disputeId++
          dispute = await contractInstance.disputes(disputeId)
          continue
        }

        numberOfJurors = await contractInstance.amountJurors(disputeId)
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

      const ArbitrableTransaction = new ArbitrableTransactionWrapper(this._Web3Wrapper, this._StoreProvider)
      let arbitrableTransactionInstance
      for (let i=0; i<myDisputes.length; i++) {
        dispute = myDisputes[i]
        // get the contract data from the disputed contract
        arbitrableTransactionInstance = await ArbitrableTransaction.getDataContract(dispute.arbitrated)

        // compute end date
        const period = (await contractInstance.period()).toNumber()
        const startTime = (await contractInstance.lastPeriodChange()).toNumber()
        const length = (await contractInstance.timePerPeriod(period)).toNumber()

        // FIXME this is all UTC for now. Timezones are a pain
        const deadline = new Date(0);
        deadline.setUTCSeconds(startTime)
        deadline.setSeconds(deadline.getSeconds() + length);

        newDisputes.push({
          votes: dispute.votes,
          // hash not being stored in contract atm
          // hash : arbitrableTransactionInstance.hashContract,
          hash: contractAddress,
          partyA: arbitrableTransactionInstance.partyA,
          partyB: arbitrableTransactionInstance.partyB,
          title: 'TODO users title',
          deadline: `${deadline.getUTCDate()}/${deadline.getUTCMonth()}/${deadline.getFullYear()}`,
          status: period,
          contractAddress: contractAddress,
          justification: 'justification',
          fee: dispute.arbitrationFeePerJuror,
          // FIXME hardcode this for now
          resolutionOptions: [
            {
              name: `Reimburse ${arbitrableTransactionInstance.partyA}`,
              description: `Release funds to ${arbitrableTransactionInstance.partyA}`,
              value: 1
            },
            {
              name: `Reimburse ${arbitrableTransactionInstance.partyB}`,
              description: `Release funds to ${arbitrableTransactionInstance.partyB}`,
              value: 2
            }
          ]
        })
      }

      // add to store
      profile.session = currentSession
      profile.disputes = newDisputes
      delete profile._id
      delete profile.created_at
      await this._StoreProvider.newUserProfile(account, profile)
    }

    return profile.disputes
  }

  /**
   * Get dispute by id FIXME isn't calling blockchain
   * @param disputeHash hash of the dispute
   * @param account address of user
   * @return objects[]
   */
  getDisputeByHash = async (
    disputeHash,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    // fetch dispute
    const disputeData = await this._StoreProvider.getDisputeData(account, disputeHash)
    if (!disputeData) throw new Error(`No dispute with hash ${disputeHash} for account ${account}`)

    // get contract data from partyA (should have same docs for both parties)
    const contractData = await this._StoreProvider.getContractByAddress(disputeData.partyA, disputeData.contractAddress)

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

    return this.getPNKBalance(contractAddress)
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
    // total tokens stored in contract
    const contractBalance = juror ? this._Web3Wrapper.fromWei(juror[0].toNumber(), 'ether') : 0
    // tokens activated in court session
    const activatedTokens = juror ? this._Web3Wrapper.fromWei((juror[4].toNumber() - juror[3].toNumber()), 'ether') : 0
    // tokens locked into disputes
    const lockedTokens = juror ? this._Web3Wrapper.fromWei(juror[2].toNumber(), 'ether') : 0

    return {
      activatedTokens,
      lockedTokens,
      tokenBalance: contractBalance
    }
  }

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

  passPeriod = async (
    contractAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    const contractInstance = await this.load(contractAddress)
    try {
      await contractInstance.passPeriod(
        {
          from: account
        }
      )
    } catch (e) {
      throw new Error(e)
    }

    return this.getData(contractAddress)
  }

  getData = async (
    contractAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    let contractInstance = await this.load(contractAddress)

    const [
      pinakion,
      rng,
      period
    ] = await Promise.all([
      contractInstance.pinakion.call(),
      contractInstance.rng.call(),
      contractInstance.period.call(),
    ]).catch(err => {
      throw new Error(err)
    })

    return {
      pinakion,
      rng,
      period: period.toNumber()
    }
  }
}

export default KlerosWrapper
