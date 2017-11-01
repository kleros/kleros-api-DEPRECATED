import * as _ from 'lodash'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import arbitrableTransaction from 'kleros-interaction/build/contracts/ArbitrableTransaction'
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
      account = this._Web3Wrapper.getAccount(0),
      value = config.VALUE,
    ) => {

    const contractDeployed = await this._deployAsync(
      account,
      value,
      kleros,
      pnkAddress,
      rngAddress,
      10000
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
   * Get disputes
   * @param account address of user
   * @return objects[]
   */
  getDisputesForUser = async (
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    let profile = await this._StoreProvider.getUserProfile(account)
    if (_.isNull(profile)) profile = await this._StoreProvider.newUserProfile(account)

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
  buyPinakion = async (
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
      balance: contractBalance
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

  getData = async (
    contractAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    let contractInstance = await this.load(contractAddress)

    const [
      pinakion
    ] = await Promise.all([
      contractInstance.pinakion.call()
    ]).catch(err => {
      throw new Error(err)
    })

    return {
      pinakion
    }
  }
}

export default KlerosWrapper
