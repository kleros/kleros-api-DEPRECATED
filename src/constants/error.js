// Kleros
export const MISSING_PARAMETERS = name => `Missing required parameter: ${name}`

// StoreProviderWrapper
export const PROFILE_NOT_FOUND = user => `No profile found for user: ${user}.`
export const NOTIFICATION_NOT_FOUND = txHash =>
  `No notification with txHash ${txHash} exists.`
export const REQUEST_FAILED = error =>
  `Request returned an error response: ${error}`

// Contracts
export const UNABLE_TO_DEPLOY_CONTRACT =
  'Unable to deploy contract, are you sure the contract artifact is correct?'
export const CONTRACT_NOT_DEPLOYED =
  'Unable to load contract. Are you sure the contract is deployed and you are on the right network?'
export const UNABLE_TO_LOAD_CONTRACT =
  'Unable to load contract. Are you sure the contract artifact is correct?'
export const MISSING_CONTRACT_PARAMETERS =
  'Unable to load contract. Missing contractAddress or Artifact. Please call setContractInstance'

// Implementation
export const CONTRACT_INSTANCE_NOT_SET =
  'No contract instance. Use setContractInstance'

// PinakionPOC
export const UNABLE_TO_SET_KLEROS = 'Unable to set Kleros.'
export const UNABLE_TO_TRANSFER_OWNERSHIP = 'Unable to transfer ownership.'

// KlerosPOC
export const UNABLE_TO_BUY_PNK =
  'Unable to buy PNK, are you sure you have enough ETH?'
export const UNABLE_TO_ACTIVATE_PNK =
  'Unable to activate PNK, are you sure you have enough?'
export const UNABLE_TO_FETCH_ARBITRATION_COST =
  'Unable to fetch arbitration cost.'
export const UNABLE_TO_FETCH_TIME_PER_PERIOD = 'Unable to fetch time per period'
export const UNABLE_TO_PASS_PERIOD = 'Unable to pass period.'
export const UNABLE_TO_FETCH_DISPUTE = 'Unable to fetch dispute.'
export const UNABLE_TO_FETCH_AMOUNT_OF_JURORS =
  'Unable to fetch amount of jurors'
export const UNABLE_TO_SUBMIT_VOTES = 'Unable to submit votes.'
export const UNABLE_TO_APPEAL = 'Unable to appeal.'
export const UNABLE_TO_REPARTITION_TOKENS = 'Unable to repartition tokens.'
export const UNABLE_TO_EXECUTE_RULING = 'Unable to execute ruling.'
export const ACCOUNT_NOT_A_JUROR_FOR_CONTRACT = (account, contractAddress) =>
  `${account} is not a juror for contract ${contractAddress}`
export const PERIOD_OUT_OF_RANGE = periodNumber =>
  `Period ${periodNumber} does not have a time associated with it.`
export const DISPUTE_DOES_NOT_EXIST = disputeId =>
  `Dispute ${disputeId} does not exist`

// ArbitrableTransaction
export const UNABLE_TO_PAY_ARBITRATION_FEE =
  'Unable to pay fee, are you sure you have enough PNK?'
export const UNABLE_TO_PAY_SELLER =
  'Unable to pay the seller, are you sure you have enough ETH?'
export const UNABLE_TO_CALL_TIMEOUT = 'Unable to call timeout.'
export const CONTRACT_IS_NOT_WAITING_ON_OTHER_PARTY =
  'Unable to call timeout, because the contract is not waiting on the other party.'
export const TIMEOUT_NOT_REACHED =
  'Unable to call timeout, because it has not been reached yet.'

// AbstractContract
export const NO_ARBITRATOR_IMPLEMENTATION_SPECIFIED =
  'No Arbitrator Contract Implementation specified. Please call setArbitrator.'
export const NO_ARBITRABLE_IMPLEMENTATION_SPECIFIED =
  'No Arbitrable Contract Implementation specified. Please call setArbitrable.'
export const NO_STORE_PROVIDER_SPECIFIED =
  'No Store Provider Specified. Please call setStoreProvider'

// Disputes
export const NO_STORE_DATA_FOR_DISPUTE = account =>
  `Account ${account} does not have store data for dispute`

// Notifications
export const MISSING_STORE_PROVIDER =
  'This method requires the use of an off chain store. Please call setStoreProviderInstance.'

// Event Listener
export const MISSING_CONTRACT_INSTANCE = contractAddress =>
  `No contract instance stored for ${contractAddress}. Please call addContractInstance.`
export const ERROR_FETCHING_EVENTS = error => `Unable to fetch events: ${error}`
