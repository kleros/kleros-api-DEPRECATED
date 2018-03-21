import _ from 'lodash'

import * as errorConstants from '../constants/error'

import PromiseQueue from './PromiseQueue'

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
      throw new Error(errorConstants.PROFILE_NOT_FOUND(userAddress))

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
      throw new Error(errorConstants.PROFILE_NOT_FOUND(userAddress))

    let contractData = _.filter(userProfile.contracts, o => o.hash === hash)

    if (contractData.length === 0) return null
    return contractData[0]
  }

  getContractByAddress = async (userAddress, addressContract) => {
    const userProfile = await this.getUserProfile(userAddress)
    if (!userProfile)
      throw new Error(errorConstants.PROFILE_NOT_FOUND(userAddress))

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

    return userProfile.lastBlock || 0
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
    const getBodyFn = () =>
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
  updateUserProfile = (account, params = {}) => {
    const getBodyFn = async () => {
      const currentProfile = (await this.getUserProfile(account)) || {}
      delete currentProfile._id
      delete currentProfile.created_at

      params.address = account

      return JSON.stringify({ ...currentProfile, ...params })
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

  updateContract = (account, address, params) => {
    const getBodyFn = async () => {
      let currentContractData = await this.getContractByAddress(
        account,
        address
      )
      if (!currentContractData) currentContractData = {}
      delete currentContractData._id

      params.address = address

      return JSON.stringify({ ...currentContractData, ...params })
    }

    return this.queueWriteRequest(
      getBodyFn,
      'POST',
      `${this._storeUri}/${account}/contracts/${address}`
    )
  }

  addEvidenceContract = (address, account, name, description, url) => {
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

  updateDisputeProfile = (account, arbitratorAddress, disputeId, params) => {
    const getBodyFn = async () => {
      const userProfile = await this.getUserProfile(account)

      const disputeIndex = _.filter(
        userProfile.disputes,
        dispute =>
          dispute.arbitratorAddress === arbitratorAddress &&
          dispute.disputeId === disputeId
      )

      const currentDisputeProfile = userProfile.disputes[disputeIndex] || {}
      delete currentDisputeProfile._id
      // set these so if it is a new dispute they are included
      params.disputeId = disputeId
      params.arbitratorAddress = arbitratorAddress

      return JSON.stringify({ ...currentDisputeProfile, ...params })
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
      delete currentDispute._id
      delete currentDispute.updated_at

      params.arbitratorAddress = arbitratorAddress
      params.disputeId = disputeId

      return JSON.stringify({ ...currentDispute, ...params })
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
    const getBodyFn = () =>
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

      if (_.isNull(notificationIndex))
        throw new Error(errorConstants.NOTIFICATION_NOT_FOUND(txHash))

      userProfile.notifications[notificationIndex].read = isRead
      delete userProfile._id
      delete userProfile.created_at
      return JSON.stringify(userProfile)
    }

    return this.queueWriteRequest(
      getBodyFn,
      'POST',
      `${this._storeUri}/${account}`
    )
  }
}

export default StoreProviderWrapper
