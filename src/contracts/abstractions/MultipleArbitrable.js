import AbstractContract from '../AbstractContract'

/**
 * Arbitrable Abstract Contarct API. This wraps an arbitrable contract. It provides
 * interaction with both the off chain store as well as the arbitrable instance. All
 * arbitrable methods from the supplied contract implementation can be called from this
 * object.
 */
class ArbitrableContract extends AbstractContract {
  /**
   * Submit evidence. FIXME should we determine the hash for the user?
   * @param {string} account - ETH address of user.
   * @param {string} arbitrableTransactionId - Id of the arbitrable transaction.
   * @param {string} name - Name of evidence.
   * @param {string} description - Description of evidence.
   * @param {string} url - A link to an evidence using its URI.
   * @param {string} hash - A hash of the evidence at the URI. No hash if content is dynamic
   * @returns {string} - txHash Hash transaction.
   */
  submitEvidence = async (
    account,
    arbitrableTransactionId,
    name,
    description,
    url,
    hash
  ) => {
    const contractAddress = this._contractImplementation.contractAddress

    // get the index of the new evidence
    const evidenceIndex = await this._StoreProvider.addEvidenceContract(
      contractAddress,
      arbitrableTransactionId,
      account,
      name,
      description,
      url,
      hash
    )

    // construct the unique URI
    const evidenceUri = this._StoreProvider.getEvidenceUri(
      account,
      contractAddress,
      arbitrableTransactionId,
      evidenceIndex
    )

    const txHash = await this._contractImplementation.submitEvidence(
      account,
      arbitrableTransactionId,
      evidenceUri
    )

    return txHash
  }
}

export default ArbitrableContract
