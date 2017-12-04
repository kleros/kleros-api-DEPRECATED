export const LOCALHOST_ETH_PROVIDER = 'http://localhost:8545'
export const LOCALHOST_STORE_PROVIDER = 'https://kleros.in'
export const RNG_ADDRESS = ''
export const DISPUTE_STATUS = 3
export const VOTING_PERIOD = 2
export const DISPUTE_STATE_INDEX = 6
export const NULL_ADDRESS = '0x'
export const DEFAULT_ARBITRATION_COST = 0.15
export const DEFAULT_RESOLUTION_OPTIONS = [
  {
    name: `Pay ${arbitrableTransactionData.partyA}`,
    description: `Release funds to ${arbitrableTransactionData.partyA}`,
    value: 1
  },
  {
    name: `Pay ${arbitrableTransactionData.partyB}`,
    description: `Release funds to ${arbitrableTransactionData.partyB}`,
    value: 2
  }
]
