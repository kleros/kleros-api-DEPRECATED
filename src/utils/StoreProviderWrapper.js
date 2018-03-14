import _ from 'lodash'

import PromiseQueue from '../../util/PromiseQueue'

class StoreProviderWrapper {
  constructor(storeProviderUri) {
    this._storeUri = storeProviderUri
    this._storeQueue = new PromiseQueue()
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
              // eslint-disable-next-line no-unused-vars
            } catch (err) {}
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

  /**
   * use the queue for write request. this allows a function to be passed so we can read immediately before we write
   * @param {fn} getBodyFn async function to call before we write. Should to reads and return JSON to be used as body.
   * @param {string} verb POST or PUT
   * @param {string} uri uri to call
   * @returns {promise} promise that returns result of request. wait on this if you need it to be syncronous
   */
  queueWriteRequest = (getBodyFn, verb, uri = null) =>
    this._storeQueue.fetch(() =>
      getBodyFn().then(result => this._makeRequest(verb, uri, result))
    )

  /**
   * If we know we are waiting on some other write before we want to read we can add a read request to the end of the queue.
   * @param {string} uri uri to hit
   * @returns {promise} promise of the result function
   */
  queueReadRequest = uri =>
    this._storeQueue.fetch(() => this._makeRequest('GET', uri))

  // **************************** //
  // *          Read            * //
  // **************************** //

  getUserProfile = async userAddress => {
    const httpResponse = await this._makeRequest(
      'GET',
      `${this._storeUri}/${userAddress}`
    )

    return httpResponse.body
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

  getDispute = async (arbitratorAddress, disputeId) => {
    const httpResponse = await this._makeRequest(
      'GET',
      `${this._storeUri}/arbitrators/${arbitratorAddress}/disputes/${disputeId}`
    )

    return httpResponse.body
  }

  // **************************** //
  // *          Write           * //
  // **************************** //

  resetUserProfile = async account => {
    const getBodyFn = async () =>
      new Promise(resolve =>
        resolve(
          JSON.stringify({
            account
          })
        )
      )

    return this.queueWriteRequest(
      getBodyFn,
      'POST',
      `${this._storeUri}/${account}`
    )
  }

  /**
   * Update user profile. NOTE: This should only be used for session and lastBlock. It is dangerous to overwrite arrays
   * @param {string} account users account
   * @param {object} params object containing kwargs to update
   * @returns {promise} resulting profile
   */
  updateUserProfile = async (account, params = {}) => {
    const getBodyFn = async () => {
      const currentProfile = (await this.getUserProfile(account)) || {}

      return new Promise(resolve => {
        resolve(
          JSON.stringify({
            address: account,
            session: params.session || currentProfile.session,
            lastBlock: params.session || currentProfile.session,
            contracts: params.contracts || currentProfile.contracts, // DANGER use contract updating methods
            disputes: params.disputes || currentProfile.disputes, // DANGER user dispute updating methods
            notifications: params.notifications || currentProfile.notifications // DANGER user notification updating methods
          })
        )
      })
    }

    return this.queueWriteRequest(
      getBodyFn,
      'POST',
      `${this._storeUri}/${account}`
    )
  }

  /**
   * Set up a new user profile if one does not exist
   * @param {string} account user's address
   * @returns {object} users existing or created profile
   */
  setUpUserProfile = async account => {
    let userProfile = await this.getUserProfile(account)
    if (_.isNull(userProfile)) {
      this.updateUserProfile(account, {})
      userProfile = await this.queueReadRequest(`${this._storeUri}/${account}`)
    }

    return userProfile
  }

  updateContract = async (account, address, params) => {
    const getBodyFn = async () => {
      let currentContractData = await this.getContractByAddress(
        account,
        address
      )
      if (!currentContractData) currentContractData = {}

      return new Promise(resolve =>
        resolve(
          JSON.stringify({
            address: address || currentContractData.address,
            hashContract: params.hashContract || currentContractData.hash,
            partyA: params.partyA || currentContractData.partyA,
            partyB: params.partyB || currentContractData.partyB,
            arbitrator: params.arbitrator || currentContractData.arbitrator,
            timeout: params.timeout || currentContractData.timeout,
            email: params.email || currentContractData.email,
            title: params.title || currentContractData.title,
            description: params.description || currentContractData.description,
            disputeId: params.disputeId || currentContractData.disputeId
          })
        )
      )
    }

    return this.queueWriteRequest(
      getBodyFn,
      'POST',
      `${this._storeUri}/${account}/contracts/${address}`
    )
  }

  addEvidenceContract = async (address, account, name, description, url) => {
    // get timestamp for submission
    const submittedAt = new Date().getTime()

    const getBodyFn = () =>
      new Promise(resolve =>
        resolve(
          JSON.stringify({
            name,
            description,
            url,
            submittedAt
          })
        )
      )

    return this.queueWriteRequest(
      getBodyFn,
      'POST',
      `${this._storeUri}/${account}/contracts/${address}/evidence`
    )
  }

  updateDisputeProfile = async (
    account,
    arbitratorAddress,
    disputeId,
    params
  ) => {
    const getBodyFn = async () => {
      const userProfile = await this.getUserProfile(account)

      const disputeIndex = _.filter(
        userProfile.disputes,
        dispute =>
          dispute.arbitratorAddress === arbitratorAddress &&
          dispute.disputeId === disputeId
      )

      const currentDisputeProfile = userProfile.disputes[disputeIndex] || {}

      return new Promise(resolve =>
        resolve(
          JSON.stringify({
            arbitratorAddress: arbitratorAddress,
            disputeId: disputeId,
            appealDraws:
              params.appealDraws || currentDisputeProfile.appealDraws,
            netPNK: params.netPNK || currentDisputeProfile.netPNK
          })
        )
      )
    }

    return this.queueWriteRequest(
      getBodyFn,
      'POST',
      `${
        this._storeUri
      }/${account}/arbitrators/${arbitratorAddress}/disputes/${disputeId}`
    )
  }

  updateDispute = async (arbitratorAddress, disputeId, params) => {
    const getBodyFn = async () => {
      const currentDispute =
        (await this.getDispute(arbitratorAddress, disputeId)) || {}

      return new Promise(resolve =>
        resolve(
          JSON.stringify({
            disputeId,
            arbitratorAddress,
            arbitrableContractAddress:
              params.arbitrableContractAddress ||
              currentDispute.arbitrableContractAddress,
            partyA: params.partyA || currentDispute.partyA,
            partyB: params.partyB || currentDispute.partyB,
            title: params.title || currentDispute.title,
            status: params.status || currentDispute.status,
            information: params.information || currentDispute.information,
            justification: params.justification || currentDispute.justification,
            resolutionOptions:
              params.resolutionOptions || currentDispute.resolutionOptions,
            appealCreatedAt:
              params.appealCreatedAt || currentDispute.appealCreatedAt,
            appealRuledAt: params.appealRuledAt || currentDispute.appealRuledAt,
            appealDeadlines:
              params.appealDeadlines || currentDispute.appealDeadlines
          })
        )
      )
    }

    return this.queueWriteRequest(
      getBodyFn,
      'POST',
      `${this._storeUri}/arbitrators/${arbitratorAddress}/disputes/${disputeId}`
    )
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
    const getBodyFn = async () =>
      new Promise(resolve =>
        resolve(
          JSON.stringify({
            notificationType,
            logIndex,
            read,
            message,
            data
          })
        )
      )

    return this.queueWriteRequest(
      getBodyFn,
      'POST',
      `${this._storeUri}/${account}/notifications/${txHash}`
    )
  }

  markNotificationAsRead = async (account, txHash, logIndex, isRead = true) => {
    const getBodyFn = async () => {
      const userProfile = await this.getUserProfile(account)

      const notificationIndex = await _.findIndex(
        userProfile.notifications,
        notification =>
          notification.txHash === txHash && notification.logIndex === logIndex
      )

      if (_.isNull(notificationIndex)) {
        throw new TypeError(`No notification with txHash ${txHash} exists`)
      }

      userProfile.notifications[notificationIndex].read = isRead
      delete userProfile._id
      delete userProfile.created_at
      return new Promise(resolve => resolve(JSON.stringify(userProfile)))
    }

    return this.queueWriteRequest(
      getBodyFn,
      'POST',
      `${this._storeUri}/${account}`
    )
  }
}

export default StoreProviderWrapper
