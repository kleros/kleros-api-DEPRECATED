import _ from 'lodash'

import ContractImplementation from '../../ContractImplementation'
import EventListener from '../../../utils/EventListener'
import httpRequest from '../../../utils/httpRequest'

/**
 * Provides interaction with standard Arbitrable contracts
 */
class MultipleArbitrable extends ContractImplementation {
  /**
   * Constructor ArbitrableTransaction.
   * @param {object} web3Provider instance
   * @param {string} contractArtifact of the contract
   * @param {string} contractAddress of the contract
   */
  constructor(web3Provider, contractArtifact, contractAddress) {
    super(web3Provider, contractArtifact, contractAddress)

    this.metaEvidenceCache = {}
  }

  /**
   * Get the meta evidence for the contract. Arbitrable Transaction can only have
   * one meta-evidence that is submitted on contract creation. Look up meta-evidence event
   * and make an http request to the resource.
   */
  getMetaEvidence = async (arbitrableTransactionId, metaEvidenceJsonLink) => {
    if (this.metaEvidenceCache[this.contractAddress])
      return this.metaEvidenceCache[this.contractAddress]

    const metaEvidenceLog = await EventListener.getEventLogs(
      this,
      'MetaEvidence',
      0,
      'latest',
      {
        _transactionId: arbitrableTransactionId,
        _evidence: metaEvidenceJsonLink
      }
    )

    if (!metaEvidenceLog[0]) return {} // NOTE better to throw errors for missing meta-evidence?

    const metaEvidenceUri = metaEvidenceLog[0].args._evidence
    // FIXME caching issue need a query param to fetch from AWS
    const metaEvidenceResponse = await httpRequest('GET', metaEvidenceUri)

    if (metaEvidenceResponse.status >= 400)
      throw new Error(`Unable to fetch meta-evidence at ${metaEvidenceUri}`)

    this.metaEvidenceCache[this.contractAddress] =
      metaEvidenceResponse.body || metaEvidenceResponse
    return metaEvidenceResponse.body || metaEvidenceResponse
  }

  /**
   * Get the evidence submitted in a dispute.
   */
  getEvidence = async evidenceJsonLink => {
    await this.loadContract()
    const arbitratorAddress = await this.contractInstance.arbitrator()
    const disputeId = (await this.contractInstance.disputeID()).toNumber()

    // No evidence yet as there is no dispute
    if (_.isNull(disputeId)) return []

    const evidenceLogs = await EventListener.getEventLogs(
      this,
      'Evidence',
      0,
      'latest',
      {
        _arbitrator: arbitratorAddress,
        _disputeID: disputeId,
        _party: this._Web3Wrapper.getAccount(0),
        _evidence: evidenceJsonLink
      }
    )

    // TODO verify hash and data are valid if hash exists
    return Promise.all(
      evidenceLogs.map(async evidenceLog => {
        const evidenceURI = evidenceLog.args._evidence
        const evidence = await httpRequest('GET', evidenceURI)
        const submittedAt = (await this._Web3Wrapper.getBlock(
          evidenceLog.blockNumber
        )).timestamp
        return {
          ...evidence.body,
          ...{ submittedBy: evidenceLog.args._party, submittedAt }
        }
      })
    )
  }

  /**
   * Fetch all standard contract data.
   */
  getContractData = async (arbitrableTransactionId, metaEvidenceJsonLink) => {
    await this.loadContract()

    const [metaEvidence] = await Promise.all([
      this.getMetaEvidence(arbitrableTransactionId, metaEvidenceJsonLink)
    ])

    return {
      metaEvidence
    }
  }
}

export default MultipleArbitrable
