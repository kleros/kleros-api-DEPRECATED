import _ from 'lodash'

class StoreProviderWrapper {
  constructor(storeProviderUri) {
    this._storeUri = storeProviderUri
  }

  _makeRequest = (verb, uri, body = null) => {
    const httpRequest = new XMLHttpRequest()
    return new Promise((resolve, reject) => {
      try {
        httpRequest.open(verb, uri, true)
        if (body) {
          httpRequest.setRequestHeader(
            'Content-Type',
            'application/json;charset=UTF-8'
          )
        }
        httpRequest.onreadystatechange = () => {
          if (httpRequest.readyState === 4) {
            let body = null
            try {
              body = JSON.parse(httpRequest.responseText)
            } catch (err) {
              console.log(err)
            }
            resolve({
              body: body,
              status: httpRequest.status
            })
          }
        }
        httpRequest.send(body)
      } catch (err) {
        reject(err)
      }
    })
  }

  getUserProfile = async userAddress => {
    const httpResponse = await this._makeRequest(
      'GET',
      `${this._storeUri}/${userAddress}`
    )

    return httpResponse.body
  }

  newUserProfile = async (address, userProfile) => {
    const httpResponse = await this._makeRequest(
      'POST',
      `${this._storeUri}/${address}`,
      JSON.stringify(userProfile)
    )

    return httpResponse
  }

  /**
   * Set up a new user profile if one does not exist
   * @param {string} address user's address
   * @returns {object} users existing or created profile
   */
  setUpUserProfile = async address => {
    let userProfile = await this.getUserProfile(address)
    if (_.isNull(userProfile)) userProfile = await this.newUserProfile(address)

    return userProfile
  }

  updateUserProfile = async (address, userProfile) => {
    delete userProfile._id
    delete userProfile.created_at
    const httpResponse = await this._makeRequest(
      'POST',
      `${this._storeUri}/${address}`,
      JSON.stringify(userProfile)
    )

    return httpResponse
  }

  getDisputeData = async (arbitratorAddress, disputeId, userAddress) => {
    const userProfile = await this.getUserProfile(userAddress)
    if (!userProfile)
      throw new Error(`No profile found for address: ${userAddress}`)

    let disputeData = _.filter(
      userProfile.disputes,
      o =>
        o.arbitratorAddress === arbitratorAddress && o.disputeId === disputeId
    )

    const httpResponse = await this._makeRequest(
      'GET',
      `${this._storeUri}/arbitrators/${arbitratorAddress}/disputes/${disputeId}`
    )
    return Object.assign({}, httpResponse.body, disputeData[0])
  }

  getContractByHash = async (userAddress, hash) => {
    const userProfile = await this.getUserProfile(userAddress)
    if (!userProfile)
      throw new Error(`No profile found for address: ${userAddress}`)

    let contractData = _.filter(userProfile.contracts, o => o.hash === hash)

    if (contractData.length === 0) return null
    return contractData[0]
  }

  getContractByAddress = async (userAddress, addressContract) => {
    const userProfile = await this.getUserProfile(userAddress)
    if (!userProfile)
      throw new Error(`No profile found for this address: ${userAddress}`)

    let contract = _.filter(
      userProfile.contracts,
      contract => contract.address === addressContract
    )

    return contract[0]
  }

  updateContract = async (
    address,
    hashContract,
    account,
    partyB,
    arbitratorAddress,
    timeout,
    email,
    description,
    disputeId
  ) => {
    const httpResponse = await this._makeRequest(
      'POST',
      `${this._storeUri}/${account}/contracts/${address}`,
      JSON.stringify({
        address,
        hashContract,
        partyA: account,
        partyB,
        arbitrator: arbitratorAddress,
        timeout,
        email,
        description,
        disputeId
      })
    )

    return httpResponse
  }

  addEvidenceContract = async (address, account, name, description, url) => {
    const httpResponse = await this._makeRequest(
      'POST',
      `${this._storeUri}/${account}/contracts/${address}/evidence`,
      JSON.stringify({
        name,
        description,
        url
      })
    )

    return httpResponse
  }

  getDispute = async (arbitratorAddress, disputeId) => {
    const httpResponse = await this._makeRequest(
      'GET',
      `${this._storeUri}/arbitrators/${arbitratorAddress}/disputes/${disputeId}`
    )

    return httpResponse.body
  }

  // FIXME very complicated to update
  updateDisputeProfile = async (
    account,
    votes,
    arbitratorAddress,
    disputeId,
    isJuror,
    hasRuled,
    netPNK
  ) => {
    const httpResponse = await this._makeRequest(
      'POST',
      `${
        this._storeUri
      }/${account}/arbitrators/${arbitratorAddress}/disputes/${disputeId}`,
      JSON.stringify({
        votes,
        arbitratorAddress,
        disputeId,
        isJuror,
        hasRuled,
        netPNK
      })
    )

    return httpResponse
  }

  // FIXME very complicated to update
  updateDispute = async (
    disputeId,
    arbitratorAddress,
    hash,
    arbitrableContractAddress,
    partyA,
    partyB,
    title,
    deadline,
    status,
    fee,
    information,
    justification,
    resolutionOptions,
    createdAt,
    ruledAt
  ) => {
    const httpResponse = await this._makeRequest(
      'POST',
      `${
        this._storeUri
      }/arbitrators/${arbitratorAddress}/disputes/${disputeId}`,
      JSON.stringify({
        disputeId,
        arbitratorAddress,
        hash,
        contractAddress: arbitrableContractAddress,
        partyA,
        partyB,
        title,
        deadline,
        status,
        fee,
        information,
        justification,
        resolutionOptions,
        createdAt,
        ruledAt
      })
    )
    return httpResponse
  }

  getDisputesForUser = async address => {
    const userProfile = await this.getUserProfile(address)
    if (!userProfile) return []

    const disputes = []
    for (let i = 0; i < userProfile.disputes.length; i++) {
      const dispute = userProfile.disputes[i]
      if (!dispute.arbitratorAddress || _.isNil(dispute.disputeId)) continue
      // fetch dispute data
      const httpResponse = await this._makeRequest(
        'GET',
        `${this._storeUri}/arbitrators/${dispute.arbitratorAddress}/disputes/${
          dispute.disputeId
        }`
      )
      if (httpResponse.status === 200) {
        disputes.push(Object.assign({}, httpResponse.body, dispute))
      }
    }

    return disputes
  }

  getLastBlock = async account => {
    const userProfile = await this.getUserProfile(account)

    return userProfile.lastBlock ? userProfile.lastBlock : 0
  }

  updateLastBlock = async (account, lastBlock) => {
    const userProfile = await this.getUserProfile(account)

    userProfile.lastBlock = lastBlock
    const httpResponse = await this.updateUserProfile(account, userProfile)
    return httpResponse
  }

  newNotification = async (
    account,
    txHash,
    logIndex,
    notificationType,
    message = '',
    data = {},
    read = false
  ) => {
    const httpResponse = await this._makeRequest(
      'POST',
      `${this._storeUri}/${account}/notifications/${txHash}`,
      JSON.stringify({
        notificationType,
        logIndex,
        read,
        message,
        data
      })
    )
    return httpResponse
  }
}

export default StoreProviderWrapper
