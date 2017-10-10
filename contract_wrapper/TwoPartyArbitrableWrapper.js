import * as _ from 'lodash'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import klerosInteraction from 'kleros-interaction/code/build/contracts/TwoPartyArbitrable'
import config from '../config'

/**
 * TwoPartyArbitrable API
 */
class TwoPartyArbitrableWrapper extends ContractWrapper {
  /**
   * Constructor TwoPartyArbitrable.
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
   * Deploy TwoPartyArbitrable.
   * @param account Ethereum account (default account[0])
   * @param value gas price value
   * @param arbitrator The arbitrator of the contract.
   *                   (default CentralizedArbitrator)
   * @param hashContract Keccak hash of the plain English contract. (default null hashed)
   * @param timeout Time after which a party automatically loose a dispute. (default 3600)
   * @param partyB The recipient of the transaction. (default account[1])
   * @param arbitratorExtraData Extra data for the arbitrator. (default empty string)
   * @return address | err The address of the contract or a deploy error
   */
  deploy = async (
      account = this._Web3Wrapper.getAccount(0),
      value = config.VALUE,
      arbitrator,
      hashContract = 'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
      timeout = 3600,
      partyB = this._Web3Wrapper.getAccount(1),
      arbitratorExtraData = ''
    ) => {

    const addressContractDeployed = await this._deployAsync(
      account,
      value,
      arbitrator,
      hashContract,
      timeout,
      partyB,
      arbitratorExtraData
    )

    this.address = addressContractDeployed

    return this.address
  }

  /**
   * Create a dispute. // FIXME mock
   * @param choices Amount of choices the arbitrator can make in this dispute.
   *                When ruling ruling<=choices.
   * @param extraData Can be used to give additional info on the dispute
   *                  to be created.
   * @returntxHash hash transaction
   */
  createDispute = async (choices, extraData=null) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve('0xeb3447da6db41b9b86570c02c97c35d8645175e9d2bb0d19ba8e486c8c78255d')
      }, 1000)
    })
  }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the party A.
   * @return txHash hash transaction
   */
  payArbitrationFeeByPartyA = async () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve('0xeb3447da6db41b9b86570c02c97c35d8645175e9d2bb0d19ba8e486c8c78255d')
      }, 1000)
    })
  }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the party B
   * @return txHash hash transaction
   */
  payArbitrationFeeByPartyB = async () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve('0xeb3447da6db41b9b86570c02c97c35d8645175e9d2bb0d19ba8e486c8c78255d')
      }, 1000)
    })
  }

  /**
   * Create a dispute.
   * @param arbitrationCost Amount to pay the arbitrator. (default 10000 wei)
   * @return txHash hash transaction
   */
  raiseDispute = async (arbitrationCost = 10000) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve('0xeb3447da6db41b9b86570c02c97c35d8645175e9d2bb0d19ba8e486c8c78255d')
      }, 1000)
    })
  }

  /**
   * Pay partyB if partyA fails to pay the fee.
   * @return txHash hash transaction
   */
  timeOutByPartyB = async () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve('0xeb3447da6db41b9b86570c02c97c35d8645175e9d2bb0d19ba8e486c8c78255d')
      }, 1000)
    })
  }

  /**
   * Submit a reference to evidence. EVENT.
   * @param evidence A link to an evidence using its URI.
   * @return txHash hash transaction
   */
  submitEvidence = async (evidence) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve('0xeb3447da6db41b9b86570c02c97c35d8645175e9d2bb0d19ba8e486c8c78255d')
      }, 1000)
    })
  }
}

export default TwoPartyArbitrableWrapper
