// Kleros
export const MISSING_PARAMETERS = name => `Missing required parameter: ${name}`

// StoreProviderWrapper
export const PROFILE_NOT_FOUND = user => `No profile found for user: ${user}.`
export const NOTIFICATION_NOT_FOUND = txHash =>
  `No notification with txHash ${txHash} exists.`

// ContractWrapper
export const UNABLE_TO_DEPLOY_CONTRACT =
  'Unable to deploy contract, are you sure the contract artifact is correct?'
export const CONTRACT_NOT_DEPLOYED =
  'Unable to load contract. Are you sure the contract is deployed and you are on the right network?'
export const UNABLE_TO_LOAD_CONTRACT =
  'Unable to load contract. Are you sure the contract artifact is correct?'

// StatefulContractWrapper
export const CONTRACT_INSTANCE_NOT_SET =
  'No contract instance. Use setContractInstance'

// PinakionWrapper
export const UNABLE_TO_SET_KLEROS = 'Unable to set Kleros.'
export const UNABLE_TO_TRANSFER_OWNERSHIP = 'Unable to transfer ownership.'

// KlerosWrapper
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

// ArbitrableTransactionWrapper
export const UNABLE_TO_PAY_ARBITRATION_FEE =
  'Unable to pay fee, are you sure you have enough PNK?'
export const UNABLE_TO_PAY_SELLER =
  'Unable to pay the seller, are you sure you have enough ETH?'
export const UNABLE_TO_CALL_TIMEOUT = 'Unable to call timeout.'
export const CONTRACT_IS_NOT_WAITING_ON_OTHER_PARTY =
  'Unable to call timeout, because the contract is not waiting on the other party.'
export const TIMEOUT_NOT_REACHED =
  'Unable to call timeout, because it has not been reached yet.'

// AbstractWrapper
export const NO_ARBITRATOR_WRAPPER_SPECIFIED =
  'No Arbitrator Contract Wrapper specified. Please call setArbitrator.'
export const NO_ARBITRABLE_WRAPPER_SPECIFIED =
  'No Arbitrable Contract Wrapper specified. Please call setArbitrable.'
export const NO_STORE_PROVIDER_SPECIFIED =
  'No Store Provider Specified. Please call setStoreProvider'

// Disputes
export const NO_STORE_DATA_FOR_DISPUTE = account =>
  `Account ${account} does not have store data for dispute`

// implementations
export const MISSING_CONTRACT_PARAMETERS =
  'Missing contractAddress or Artifact. Cannot load contract. Please call setContractInstance'
