import Dispute from './Dispute'

class CentralizedArbitratorDispute extends Dispute {
  constructor(storeProvider, contractDispute) {
    this.choices = contractDispute.choices
    this.fee = contractDispute.fee
  }

  /**
   * TODO mock
   * Constructor Dispute.
   * @param storeProvider storage provider (Kleros Store, IPFS etc.)
   */
  getDataFromStore = async documentHash => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve('0xeb3447da6db41b9b86570c02c97c35d8645175e9d2bb0d19ba8e486c8c78255d')
      }, 1000)
    })
  }
}

export default CentralizedArbitratorDispute
