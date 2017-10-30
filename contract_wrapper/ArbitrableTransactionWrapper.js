import * as _ from 'lodash'
import BigNumber from 'bignumber'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import arbitrableTransaction from 'kleros-interaction/build/contracts/ArbitrableTransaction'
import config from '../config'

/**
 * ArbitrableTransaction API
 */
class ArbitrableTransactionWrapper extends ContractWrapper {
  /**
   * Constructor ArbitrableTransaction.
   * @param web3 instance
   * @param address of the contract (optional)
   */
  constructor(web3Provider, storeProvider, address) {
    super(web3Provider, storeProvider)
    if (!_.isUndefined(address)) {
      this.address = address
    }
    this.contractInstance = null
  }

  /**
   * Deploy ArbitrableTransaction.
   * @param account Ethereum account (default account[0])
   * @param value gas price value
   * @param arbitrator The arbitrator of the contract.
   *                   (default CentralizedArbitrator)
   * @param hashContract Keccak hash of the plain English contract. (default null hashed)
   * @param timeout Time after which a party automatically loose a dispute. (default 3600)
   * @param partyB The recipient of the transaction. (default account[1])
   * @param arbitratorExtraData Extra data for the arbitrator. (default empty string)
   * @return truffle-contract Object | err The deployed contract or an error
   */
  deploy = async (
      account = this._Web3Wrapper.getAccount(0),
      value = config.VALUE,
      arbitrator,
      hashContract = 0x6aa0bb2779ab006be0739900654a89f1f8a2d7373ed38490a7cbab9c9392e1ff,
      timeout = 100,
      partyB = this._Web3Wrapper.getAccount(1),
      arbitratorExtraData = '',
      email = '',
      description = ''
    ) => {

    const contractDeployed = await this._deployAsync(
      account,
      value,
      arbitrableTransaction,
      arbitrator,
      hashContract,
      timeout,
      partyB,
      arbitratorExtraData
    )

    this.address = contractDeployed.address
    this.contractInstance = contractDeployed

    await this._StoreProvider.updateContract(
      this.address,
      hashContract,
      account,
      partyB,
      arbitrator,
      timeout,
      email,
      description
    )

    return contractDeployed
  }

  /**
   * Load an existing arbitrableTransaction contract
   * @param address Contract address
   * @return contractInstance | Error
   */
  load = async address => {
    try {
      const contractInstance = await this._instantiateContractIfExistsAsync(
        arbitrableTransaction,
        address
      )

      this.contractInstance = contractInstance
      this.address = address

      return contractInstance
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the party A.
   * @param account Ethereum account (default account[1])
   * @param arbitrationCost Amount to pay the arbitrator. (default 10000 wei)
   * @return txHash hash transaction | Error
   */
  payArbitrationFeeByPartyA = async (
    account = this._Web3Wrapper.getAccount(0),
    arbitrationCost = 10000,
  ) => {
    try {
      let txHashObj = await this.contractInstance.payArbitrationFeeByPartyA(
        {
          from: account,
          gas: config.GAS,
          value: arbitrationCost,
        }
      )
      return txHashObj.tx
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the party B.
   * @param account Ethereum account (default account[1])
   * @param arbitrationCost Amount to pay the arbitrator. (default 10000 wei)
   * @return txHash hash transaction | Error
   */
  payArbitrationFeeByPartyB = async (
    account = this._Web3Wrapper.getAccount(1),
    arbitrationCost = 10000,
  ) => {
    try {
      let txHashObj = await this.contractInstance.payArbitrationFeeByPartyB(
        {
          from: account,
          gas: config.GAS,
          value: arbitrationCost,
        }
      )
      return txHashObj.tx
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * Create a dispute.
   * @param arbitrationCost Amount to pay the arbitrator. (default 10000 wei)
   * @return txHash Hash transaction
   */
  raiseDispute = async (arbitrationCost = 10000) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(0xeb3447da6db41b9b86570c02c97c35d8645175e9d2bb0d19ba8e486c8c78255d)
      }, 1000)
    })
  }

  /**
   * Pay partyB if partyA fails to pay the fee.
   * @return txHash Hash transaction
   */
  timeOutByPartyB = async () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(0xeb3447da6db41b9b86570c02c97c35d8645175e9d2bb0d19ba8e486c8c78255d)
      }, 1000)
    })
  }

  /**
   * Submit a reference to evidence. EVENT.
   * @param evidence A link to an evidence using its URI.
   * @return txHash Hash transaction
   */
  submitEvidence = async evidence => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(0xeb3447da6db41b9b86570c02c97c35d8645175e9d2bb0d19ba8e486c8c78255d)
      }, 1000)
    })
  }

  /**
   * Pay the party B. To be called when the good is delivered or the service rendered.
   * @return txHash Hash transaction
   */
  pay = async () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(0xeb3447da6db41b9b86570c02c97c35d8645175e9d2bb0d19ba8e486c8c78255d)
      }, 1000)
    })
  }

  /**
   * Reimburse party A. To be called if the good or service can't be fully provided.
   * @param amountReimbursed Amount to reimburse in wei.
   * @return txHash Hash transaction
   */
  reimburse = async amountReimbursed => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(0xeb3447da6db41b9b86570c02c97c35d8645175e9d2bb0d19ba8e486c8c78255d)
      }, 1000)
    })
  }

  /**
   * Data of the contract
   * @param address Address of the ArbitrableTransaction contract.
   * @return Object Data of the contract.
   */
   getDataContract = async address => {
     let contractDeployed = await this.load(address)
     let [
       arbitrator,
       // hashContract, // FIXME getter for the hash contract see contractHash see https://github.com/kleros/kleros-interaction/blob/master/test/TwoPartyArbitrable.js#L19
       timeout,
       partyA,
       partyB,
       status,
       arbitratorExtraData
     ] = await Promise.all([
       contractDeployed.arbitrator.call(),
       // contractDeployed.hashContract.call(),
       contractDeployed.timeout.call(),
       contractDeployed.partyA.call(),
       contractDeployed.partyB.call(),
       contractDeployed.status.call(),
       contractDeployed.arbitratorExtraData.call()
     ]).catch(err => {
       throw new Error(err)
     })

     const storeDataContract = await this._StoreProvider.getContractByAddress(partyA, address)

     return {
       arbitrator,
       //hashContract,
       timeout: timeout.toNumber(),
       partyA,
       partyB,
       status: status.toNumber(),
       arbitratorExtraData,
       email: storeDataContract.email,
       description: storeDataContract.description
     }
   }
}

export default ArbitrableTransactionWrapper
