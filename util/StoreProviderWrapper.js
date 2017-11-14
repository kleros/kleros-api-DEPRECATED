import _ from 'lodash'

class StoreProviderWrapper {
  constructor(storeProviderUri) {
    this._storeUri = storeProviderUri
  }

  _makeRequest = async (verb, uri, body = null) => {
    const httpRequest = new XMLHttpRequest()
    return new Promise ((resolve, reject) => {
      try {
        httpRequest.open(verb, uri, true)
        if (body) {
          httpRequest.setRequestHeader(
            'Content-Type',
            'application/json;charset=UTF-8'
          )
        }
        httpRequest.onreadystatechange =  () => {
          if (httpRequest.readyState === 4) {
            resolve(httpRequest.responseText)
          }
        }
        httpRequest.send(body)
      } catch (e) {
        reject(e)
      }
    })
  }

  getUserProfile = async userAddress => {
    const httpResponse = await this._makeRequest(
      'GET',
      `${this._storeUri}/${userAddress}`
    )

    return JSON.parse(httpResponse)
  }

  newUserProfile = async (address, userProfile) => {
    const httpResponse = await this._makeRequest(
      'POST',
      `${this._storeUri}/${address}`,
      JSON.stringify(userProfile)
    )
    return JSON.parse(httpResponse)
  }

  updateUserProfile = async (address, userProfile) => {
    delete userProfile._id
    delete userProfile.created_at
    const httpResponse = await this._makeRequest(
      'POST',
      `${this._storeUri}/${address}`,
      JSON.stringify(userProfile)
    )
    return JSON.parse(httpResponse)
  }

  getDisputeData = async (userAddress, hash) => {
    const userProfile = await this.getUserProfile(userAddress)
    if (!userProfile) throw new Error(`No profile found for address: ${userAddress}`)

    let disputeData = _.filter(userProfile.disputes, (o) => {
      return o.hash === hash
    })

    if (_.isEmpty(disputeData)) return null
    return disputeData[0]
  }

  getContractByHash = async (userAddress, hash) => {
    const userProfile = await this.getUserProfile(userAddress)
    if (!userProfile) throw new Error(`No profile found for address: ${userAddress}`)

    let contractData = _.filter(userProfile.contracts, (o) => {
      return o.hash === hash
    })

    if (contractData.length < 1) return null
    return contractData[0]
  }

  getContractByAddress = async (userAddress, addressContract) => {
    const userProfile = await this.getUserProfile(userAddress)
    if (!userProfile) throw new Error(`No profile found for this address: ${userAddress}`)

    let contract = _.filter(userProfile.contracts, contract => {
      return contract.address === addressContract
    })

    return contract[0]
  }

  updateContract = async (
    address,
    hashContract,
    account,
    partyB,
    arbitrator,
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
        arbitrator,
        timeout,
        email,
        description,
        disputeId
      })
    )

    return httpResponse
  }

  addEvidenceContract = async (
    address,
    account,
    url
  ) => {
    const httpResponse = await this._makeRequest(
      'POST',
      `${this._storeUri}/${account}/contracts/${address}/evidence`,
      JSON.stringify({
        url
      })
    )

    return httpResponse
  }

  // FIXME very complicated to update
  updateDispute = async (
    account,
    disputeId,
    votes,
    hash,
    contractAddress,
    partyA,
    partyB,
    title,
    deadline,
    status,
    fee,
    information,
    justification,
    isJuror,
    hasRuled,
    isActive,
    resolutionOptions
  ) => {
    const httpResponse = await this._makeRequest(
      'POST',
      `${this._storeUri}/${account}/disputes/${hash}`,
      JSON.stringify({
        disputeId,
        votes,
        hash,
        contractAddress,
        partyA,
        partyB,
        title,
        deadline,
        status,
        fee,
        information,
        justification,
        isJuror,
        hasRuled,
        isActive,
        resolutionOptions
      })
    )

    return httpResponse
  }
}

export default StoreProviderWrapper
