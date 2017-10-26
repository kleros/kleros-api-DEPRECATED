import Kleros from '../src/Kleros'
import Web3 from 'web3'
import {LOCALHOST_ETH_PROVIDER, LOCALHOST_STORE_PROVIDER} from '../constants'
import config from '../config'

const contractDataFake = [{"hash": "0x139963ddb98576ddd5f39c14b6cf2c12670b38a1", "contentDocument": '{"evidenceB": "<some byte string>"}'}]

let postDataToStore = async (contractsJson = '{}', disputesJson = '{}') => {
  // use testRPC
  const ethProvider = await new Web3.providers.HttpProvider(LOCALHOST_ETH_PROVIDER)
  const storeProvider = LOCALHOST_STORE_PROVIDER

  let KlerosInstance = await new Kleros(ethProvider, storeProvider)
  const userAccount = KlerosInstance._web3Wrapper.getAccount(1)

  const httpResponse = await KlerosInstance.store.newUserProfile(userAccount,   contractDataFake, JSON.parse(disputesJson))
  console.log(httpResponse)
}

// optional params for contract and dispute json
const contractsJson = process.argv[2];
const disputesJson = process.argv[3];

postDataToStore(contractsJson, disputesJson)
