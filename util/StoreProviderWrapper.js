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

    if (!httpResponse)
      throw new Error(`No profile found for address: ${userAddress}`)

    return JSON.parse(httpResponse)
  }

  newUserProfile = async (userAddress, contractsData = {}, disputesData = {}) => {
    const httpResponse = await this._makeRequest(
      'POST',
      this._storeUri + '/' + userAddress,
      JSON.stringify(Object.assign({}, {contracts: contractsData}, {disputes: disputesData}))
    )
    return httpResponse
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
    if (!userProfile) throw new Error(`No profile found for address: ${userAddress}`)

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
    description
  ) => {
    const userProfile = await this.getUserProfile(account)

    const httpResponse = await this._makeRequest(
      'POST',
      `${this._storeUri}/${account}/contracts/${address}`,
      JSON.stringify({
        address,
        hashContract,
        account,
        partyB,
        arbitrator,
        timeout,
        email,
        description
      })
    )

    return httpResponse
  }
}

export default StoreProviderWrapper
