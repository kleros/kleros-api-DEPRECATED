import * as _ from 'lodash'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import arbitrableTransaction from 'kleros-interaction/build/contracts/ArbitrableTransaction'
import kleros from 'kleros/build/contracts/MetaCoin' // FIXME mock
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
      account = this._Web3Wrapper.getAccount(0),
      value = config.VALUE,
    ) => {

    const contractDeployed = await this._deployAsync(
      account,
      value,
      kleros
    )

    this.address = addressContractDeployed.address

    return contractDeployed
  }

  /**
   * Get disputes
   * @param account address of user
   * @return objects[]
   */
  getDisputesForUser = async (
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    const profile = await this._StoreProvider.getUserProfile(account)
    if (!profile) throw new Error("No user profile for " + account)
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
}

export default KlerosWrapper
