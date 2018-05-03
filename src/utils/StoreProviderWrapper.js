import _ from 'lodash'

import * as errorConstants from '../constants/error'

import PromiseQueue from './PromiseQueue'

/**
 * A wrapper for interacting with Kleros Store.
 */
class StoreProviderWrapper {
  /**
   * Create a new instance of StoreProviderWrapper.
   * @param {string} storeProviderUri - The uri of kleros store.
   * @param {string} authToken - Signed token cooresponding to user profile address.
   */
  constructor(storeProviderUri, authToken) {
    this._storeUri = storeProviderUri
    this._token = authToken
    this._storeQueue = new PromiseQueue()
  }

  /**
   * Helper method for sending an http request to kleros store.
   * @param {string} verb - HTTP verb to be used in request. E.g. GET, POST, PUT.
   * @param {string} uri - The uri to send the request to.
   * @param {string} body - json string of the body.
   * @returns {Promise} request promise that resolves to the HTTP response.
   */
  _makeRequest = (verb, uri, body = null) => {
    if (verb !== 'GET' && !this._token) {
      throw new Error(
        'No auth token set. Cannot make writes to store. Please call setAuthToken or validateNewAuthToken.'
      )
    }

    const httpRequest = new XMLHttpRequest()
    return new Promise((resolve, reject) => {
      try {
        httpRequest.open(verb, uri, true)
        if (body) {
          httpRequest.setRequestHeader(
            'Content-Type',
            'application/json;charset=UTF-8'
          )
          httpRequest.setRequestHeader('Authorization', this._token)
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
   * @returns {Promise} promise of the result function
   */
  queueReadRequest = uri =>
    this._storeQueue.fetch(() => this._makeRequest('GET', uri))

  // **************************** //
  // *          Auth            * //
  // **************************** //

  /**
   * Set the auth token for write requests.
   * @param {string} token - Hex string of the signed data token.
   */
  setAuthToken = token => {
    this._token = token
  }

  /**
   * Generate a new unsigned auth token.
   * @param {string} userAddress - Address of the user profile.
   * @returns {string} Hex encoded unsigned token.
   */
  newAuthToken = async userAddress => {
    const newTokenResponse = await this._makeRequest(
      'GET',
      `${this._storeUri}/${userAddress}/authToken`
    )

    return newTokenResponse.body
  }
  // **************************** //
  // *          Read            * //
  // **************************** //

  /**
   * Fetch stored user profile.
   * @param {string} userAddress - Address of user.
   * @returns {object} - a response object.
   */
  getUserProfile = async userAddress => {
    const httpResponse = await this._makeRequest(
      'GET',
      `${this._storeUri}/${userAddress}`
    )

    return httpResponse.body
  }

  /**
   * Get all stored data from a dispute. This includes data from the user profile as well
   * as the user agnostic dispute data stored separately.
   * @param {string} arbitratorAddress - Address of arbitrator contract.
   * @param {number} disputeId - Index of the dispute.
   * @param {string} userAddress - Address of user.
   * @returns {object} - a response object.
   */
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

  /**
   * Fetch stored data on a contract for a user.
   * @param {string} userAddress - Address of the user.
   * @param {string} addressContract - The address of the contract.
   * @returns {object} - Contact data.
   */
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

  /**
   * Fetch stored disputes for a user.
   * @param {string} userAddress - Address of user.
   * @returns {object} - a response object.
   */
  getDisputesForUser = async userAddress => {
    const userProfile = await this.getUserProfile(userAddress)
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

  /**
   * Fetch the last block seen for a user. This is commonly used with EventListerer.
   * @param {string} userAddress - Address of user.
   * @returns {number} The last block number.
   */
  getLastBlock = async userAddress => {
    const userProfile = await this.setUpUserProfile(userAddress)

    return userProfile.lastBlock || 0
  }

  /**
   * Fetch user agnostic data stored on a dispute
   * @param {string} arbitratorAddress - The address of the arbitrator contract.
   * @param {number} disputeId - The index of the dispute.
   * @returns {object} - a response object.
   */
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

  /**
   * Update user profile. WARNING: This should only be used for session and lastBlock.
   * Overwriting arrays of unstructured data can lead to data loss.
   * @param {string} userAddress - users userAddress
   * @param {object} params - object containing kwargs to update
   * @returns {promise} - resulting profile
   */
  updateUserProfile = (userAddress, params = {}) => {
    const getBodyFn = async () => {
      const currentProfile = (await this.getUserProfile(userAddress)) || {}
      delete currentProfile._id
      delete currentProfile.created_at

      params.address = userAddress

      return JSON.stringify({ ...currentProfile, ...params })
    }

    return this.queueWriteRequest(
      getBodyFn,
      'POST',
      `${this._storeUri}/${userAddress}`
    )
  }

  /**
   * Set up a new user profile if one does not exist.
   * @param {string} userAddress - user's address
   * @returns {object} - users existing or created profile
   */
  setUpUserProfile = async userAddress => {
    let userProfile = await this.getUserProfile(userAddress)
    if (_.isNull(userProfile)) {
      const response = await this.updateUserProfile(userAddress, {})
      if (response.status !== 201)
        throw new Error(errorConstants.REQUEST_FAILED(response.responseText))
      userProfile = response.body
    }

    return userProfile
  }

  /**
   * Update the stored data on a contract for a user.
   * @param {string} userAddress - The user's address.
   * @param {string} contractAddress - The address of the contract.
   * @param {object} params - Params we want to update.
   * @returns {Promise} - The resulting contract data.
   */
  updateContract = async (userAddress, contractAddress, params) => {
    const getBodyFn = async () => {
      let currentContractData = await this.getContractByAddress(
        userAddress,
        contractAddress
      )
      if (!currentContractData) currentContractData = {}
      delete currentContractData._id

      params.address = contractAddress

      return JSON.stringify({ ...currentContractData, ...params })
    }

    const httpResponse = await this.queueWriteRequest(
      getBodyFn,
      'POST',
      `${this._storeUri}/${userAddress}/contracts/${contractAddress}`
    )

    if (httpResponse.status !== 200) {
      throw new Error(errorConstants.REQUEST_FAILED(httpResponse.error))
    }

    return _.filter(
      httpResponse.body[0].contracts,
      contract => contract.address === contractAddress
    )[0]
  }

  /**
   * Adds new evidence to the store for a users contract. NOTE this will only update the
   * stored evidence for the specified user, not all parties of the dispute.
   * @param {string} contractAddress - Address of the contract
   * @param {string} userAddress - Address of the user.
   * @param {string} name - Name of evidence.
   * @param {string} description - Description of evidence.
   * @param {string} url - A link to the evidence.
   * @returns {Promise} - The resulting evidence data.
   */
  addEvidenceContract = (
    contractAddress,
    userAddress,
    name,
    description,
    url
  ) => {
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
      `${this._storeUri}/${userAddress}/contracts/${contractAddress}/evidence`
    )
  }

  /**
   * Update stored dispute data for a user.
   * @param {string} userAddress - The address of the user.
   * @param {string} arbitratorAddress - The address of the arbitrator contract.
   * @param {number} disputeId - The index of the dispute.
   * @param {object} params - The dispute data we are updating.
   * @returns {Promise} The resulting dispute data.
   */
  updateDisputeProfile = (
    userAddress,
    arbitratorAddress,
    disputeId,
    params
  ) => {
    const getBodyFn = async () => {
      const userProfile = await this.setUpUserProfile(userAddress)

      const currentDisputeProfile =
        _.filter(
          userProfile.disputes,
          dispute =>
            dispute.arbitratorAddress === arbitratorAddress &&
            dispute.disputeId === disputeId
        )[0] || {}

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
      }/${userAddress}/arbitrators/${arbitratorAddress}/disputes/${disputeId}`
    )
  }

  /**
   * Update the user agnostic data on a dispute.
   * @param {string} arbitratorAddress - The address of the arbitrator contract.
   * @param {number} disputeId - The index of the dispute.
   * @param {object} params - The data we are updating.
   * @returns {Promise} The resulting dispute data.
   */
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

  /**
   * Create a new notification in the store.
   * @param {string} userAddress - The address of the user.
   * @param {string} txHash - The transaction hash which produced this event log. Used as an identifier.
   * @param {number} logIndex - The index of the log in the transaction. Used as an identifier.
   * @param {number} notificationType - The type of the notification. See constants/notification.
   * @param {string} message - The message to be stored with the notification.
   * @param {object} data - Any extra data stored with the notification.
   * @param {boolean} read - If the notification has been read or not.
   * @returns {Promise} - The resulting notification.
   */
  newNotification = async (
    userAddress,
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
      `${this._storeUri}/${userAddress}/notifications/${txHash}`
    )
  }

  /**
   * Create a new notification in the store.
   * @param {string} userAddress - The address of the user.
   * @param {string} txHash - The transaction hash which produced this event log. Used as an identifier.
   * @param {number} logIndex - The index of the log in the transaction. Used as an identifier.
   * @param {boolean} isRead - If the notification has been read or not.
   * @returns {Promise} - The resulting notification.
   */
  markNotificationAsRead = async (
    userAddress,
    txHash,
    logIndex,
    isRead = true
  ) => {
    const getBodyFn = async () => {
      const userProfile = await this.setUpUserProfile(userAddress)

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

    const result = await this.queueWriteRequest(
      getBodyFn,
      'POST',
      `${this._storeUri}/${userAddress}`
    )

    return result.body.notifications
  }
}

export default StoreProviderWrapper
