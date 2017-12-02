import * as _ from 'lodash'
import BigNumber from 'bignumber'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import KlerosWrapper from './KlerosWrapper'
import arbitrableTransaction from 'kleros-interaction/build/contracts/ArbitrableTransaction'
import config from '../config'
import { DISPUTE_STATUS } from '../constants'

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
   * @param value funds to be placed in contract
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
    // return contract instance if already loaded
    if (this.contractInstance && this.contractInstance.address === address) return this.contractInstance

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
     contractAddress, // ethereum address of the contract
     arbitrationCost = 0.15,
   ) => {
     try {
       this.contractInstance = await this.load(contractAddress)
       const txHashObj = await this.contractInstance
         .payArbitrationFeeByPartyA(
         {
           from: account,
           gas: config.GAS,
           value: this._Web3Wrapper.toWei(arbitrationCost, 'ether'),
         }
       )

       const dataContract = await this.getDataContract(
         contractAddress
       )

       await this._StoreProvider.updateContract(
         contractAddress,
         dataContract.hashContract,
         dataContract.account,
         dataContract.partyB,
         dataContract.arbitrator,
         dataContract.timeout,
         dataContract.email,
         dataContract.description,
         dataContract.disputeId
       )

       // updated store if there is a dispute
       await this._contractHasDispute(contractAddress)

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
     contractAddress, // ethereum address of the contract
     arbitrationCost = 0.15
   ) => {
     try {
       this.contractInstance = await this.load(contractAddress)
       const txHashObj = await this.contractInstance
         .payArbitrationFeeByPartyB(
         {
           from: account,
           gas: config.GAS,
           value: this._Web3Wrapper.toWei(arbitrationCost, 'ether')
         }
       )

       const dataContract = await this.getDataContract(
         contractAddress
       )

       await this._StoreProvider.updateContract(
         contractAddress,
         dataContract.hashContract,
         dataContract.account,
         dataContract.partyB,
         dataContract.arbitrator,
         dataContract.timeout,
         dataContract.email,
         dataContract.description,
         dataContract.disputeId
       )

       // updated store if there is a dispute
       await this._contractHasDispute(contractAddress)

       return txHashObj.tx
     } catch (e) {
       throw new Error(e)
     }
   }

   /**
   * FIXME DRY this out with KlerosWrapper.getDisputesForUser
   * If there is a dispute in contract update store
   * @param contractAddress
   * @param account
   * @return Boolean
   */
   _contractHasDispute = async (
     contractAddress
   ) => {
     const contractInstance = await this.load(contractAddress)
     const contractStatus = (await this.contractInstance.status.call()).toNumber()

     if (contractStatus === DISPUTE_STATUS) {
       // load court address FIXME messy
       const klerosAddress = await contractInstance.arbitrator()
       const KlerosCourt = new KlerosWrapper(this._Web3Wrapper, this._StoreProvider)
       const klerosInstance = await KlerosCourt.load(klerosAddress)

       let disputeId = 0
       let dispute = await klerosInstance.disputes(disputeId)
       while (dispute[0] !== '0x') {
         // once we find our dispute stop
         if (dispute[0] === contractAddress) break
         disputeId += 1
         dispute = await klerosInstance.disputes(disputeId)
       }

       // make sure we didn't just go all the way through all the disputes
       if (dispute[0] === '0x')
       throw new Error('unable to find dispute for contract')

       const myDispute = {
         id: disputeId,
         arbitrated: dispute[0],
         session: dispute[1].toNumber(),
         appeals: dispute[2].toNumber(),
         choices: dispute[3].toNumber(),
         initialNumberJurors: dispute[4].toNumber(),
         arbitrationFeePerJuror: dispute[5].toNumber(),
       }

       const partyA = await contractInstance.partyA.call()
       const disputeData = await this.getDataContractForDispute(partyA, contractAddress, myDispute)

       // update dispute
       await this._StoreProvider.updateDispute(
         disputeData.disputeId,
         disputeData.hash,
         disputeData.contractAddress,
         disputeData.partyA,
         disputeData.partyB,
         disputeData.title,
         disputeData.deadline,
         disputeData.status,
         disputeData.fee,
         disputeData.information,
         disputeData.justification,
         disputeData.resolutionOptions
       )

       // update profile partyA
       await this._StoreProvider.updateDisputeProfile(
         disputeData.partyA,
         disputeData.votes,
         disputeData.hash,
         false,
         false
       )

       // update profile partyB
       await this._StoreProvider.updateDisputeProfile(
         disputeData.partyB,
         disputeData.votes,
         disputeData.hash,
         false,
         false
       )
     }
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
  submitEvidence = async (
    account = this._Web3Wrapper.getAccount(0),
    contractAddress,
    name,
    description = '',
    url
  ) => {
    this.contractInstance = await this.load(contractAddress)
    const txHashObj = await this.contractInstance
      .submitEvidence(
        JSON.stringify(
          name,
          description,
          url
        ),
        {
          from: account,
          gas: config.GAS,
          value: 0
        }
      )

    await this._StoreProvider.addEvidenceContract(
      contractAddress,
      account,
      name,
      description,
      url
    )

    return txHashObj.tx
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
   * @param account Address of the party.
   * @param address Address of the ArbitrableTransaction contract.
   * @return Object Data of the contract.
   */
  getDataContract = async (
    address
  ) => {
    const contractDeployed = await this.load(address)

     const [
       arbitrator,
       // hashContract, // FIXME getter for the hash contract see contractHash see https://github.com/kleros/kleros-interaction/blob/master/test/TwoPartyArbitrable.js#L19
       extraData,
       timeout,
       partyA,
       partyB,
       status,
       arbitratorExtraData,
       disputeId,
       partyAFee,
       partyBFee
     ] = await Promise.all([
       contractDeployed.arbitrator.call(),
       contractDeployed.arbitratorExtraData.call(),
      //  contractDeployed.hashContract.call(),
       contractDeployed.timeout.call(),
       contractDeployed.partyA.call(),
       contractDeployed.partyB.call(),
       contractDeployed.status.call(),
       contractDeployed.arbitratorExtraData.call(),
       contractDeployed.disputeID.call(),
       contractDeployed.partyAFee.call(),
       contractDeployed.partyBFee.call(),
     ]).catch(err => {
       throw new Error(err)
     })

     let storeDataContractPartyA,
         storeDataContractPartyB
     try {
       storeDataContractPartyA = await this._StoreProvider.getContractByAddress(
         partyA,
         address
       )
       storeDataContractPartyB = await this._StoreProvider.getContractByAddress(
         partyB,
         address
       )
       if (!storeDataContractPartyA) storeDataContractPartyA = {}
       if (!storeDataContractPartyB) storeDataContractPartyB = {}
     } catch(e) {
       storeDataContractPartyA = {}
       storeDataContractPartyB = {}
     }

     const partyAEvidence = storeDataContractPartyA.evidences ? storeDataContractPartyA.evidences : []
     const partyBEvidence = storeDataContractPartyB.evidences ? storeDataContractPartyB.evidences : []
     return {
       arbitrator,
       extraData,
      //  hashContract,
       address,
       timeout: timeout.toNumber(),
       partyA,
       partyB,
       status: status.toNumber(),
       arbitratorExtraData,
       email: storeDataContractPartyA.email,
       description: storeDataContractPartyA.description,
       disputeId,
       partyAFee: partyAFee.toNumber(),
       partyBFee: partyBFee.toNumber(),
       evidences: [
         ...partyAEvidence,
         ...partyBEvidence
       ]
     }
   }

   /**
    * FIXME this belongs in a higher order Dispute object
    * get data from contract for dispute
    * @param account Address of the party.
    * @param contractAddress address for arbitable transaction
    * @param dispute object that is representation of dispute
    * @return Object Data of the contract.
    */
   getDataContractForDispute = async (
     account = this._Web3Wrapper.getAccount(0),
     contractAddress,
     dispute
   ) => {
     const contractDeployed = await this.load(contractAddress)
     // get the contract data from the disputed contract
     const arbitrableTransactionData = await this.getDataContract(
       contractAddress
     )

     return ({
       votes: dispute.votes,
       // FIXME hash not being stored in contract atm
       hash: contractAddress,
       partyA: arbitrableTransactionData.partyA,
       partyB: arbitrableTransactionData.partyB,
       title: 'TODO users title',
       status: arbitrableTransactionData.status,
       contractAddress: contractAddress,
       justification: 'justification',
       fee: dispute.arbitrationFeePerJuror,
       disputeId: dispute.id,
       session: dispute.session + dispute.appeals,
       // FIXME hardcode this for now
       resolutionOptions: [
         {
           name: `Pay ${arbitrableTransactionData.partyA}`,
           description: `Release funds to ${arbitrableTransactionData.partyA}`,
           value: 1
         },
         {
           name: `Pay ${arbitrableTransactionData.partyB}`,
           description: `Release funds to ${arbitrableTransactionData.partyB}`,
           value: 2
         }
       ]
     })
   }
}

export default ArbitrableTransactionWrapper
