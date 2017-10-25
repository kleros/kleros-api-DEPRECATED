import _ from 'lodash'

class StoreProviderWrapper {
  constructor(storeProviderUri) {
    this._storeUri = storeProviderUri
  }

  _makeRequest = async (verb, uri, body=null) => {
    const httpRequest = new XMLHttpRequest()
    return new Promise ((resolve, reject) => {
      try {
        httpRequest.open(verb, uri, true)
        if (body) {
          httpRequest.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')
        }
        httpRequest.onreadystatechange = function () {
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

  getUserProfile = async (userAddress) => {
    let httpResponse = await this._makeRequest('GET', this._storeUri + '/' + userAddress)
    if (httpResponse) {
      return JSON.parse(httpResponse)
    } else {
      return null
    }
  }

  newUserProfile = async (userAddress, contractsData = {}, disputesData = {}) => {
    let httpResponse = await this._makeRequest(
      'POST',
      this._storeUri + '/' + userAddress,
      JSON.stringify(Object.assign({}, {contracts: contractsData}, {disputes: disputesData}))
    )
    return httpResponse
  }

  getDocumentsForDispute = async (userAddress, hash) => {
    const userProfile = await this.getUserProfile(userAddress)
    if (!userProfile) throw new Error("No profile found for address: " + userAddress)

    let disputeData = _.filter(userProfile.disputes, (o) => {
      return o.hash === hash
    })

    if (disputeData.length < 1) return null
    return JSON.parse(disputeData[0].contentDocument)
  }

  getDocumentsForContract = async (userAddress, hash) => {
    const userProfile = await this.getUserProfile(userAddress)
    if (!userProfile) throw new Error("No profile found for address: " + userAddress)

    let contractData = _.filter(userProfile.contracts, (o) => {
      return o.hash === hash
    })

    if (contractData.length < 1) return null
    return JSON.parse(contractData[0].contentDocument)
  }
}

export default StoreProviderWrapper
