class StoreProviderWrapper {
  constructor(storeProviderUri) {
    this._storeUri = storeProviderUri
  }

  _makeRequest = async (verb, uri, body) => {
    const httpRequest = new XMLHttpRequest()
    return new Promise ((resolve, reject) => {
      httpRequest.open(verb, uri, true)
      if (body) {
        httpRequest.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')
      }
      httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState === 4) {
          resolve(JSON.parse(httpRequest.responseText))
        }
      }
      httpRequest.send(body)
    })
  }

  getUserProfile = async (userAddress) => {
    let httpResponse = await this._makeRequest('GET', this._storeUri + '/' + userAddress)
    return httpResponse
  }

  newUserProfile = async (userAddress, contractsData = {}, disputesData = {}) => {
    let httpResponse = await this._makeRequest(
      'POST',
      this._storeUri + '/' + userAddress,
      JSON.stringify(Object.assign({}, {contracts: contractsData}, {disputes: disputesData}))
    )
    return httpResponse
  }
}

export default StoreProviderWrapper
