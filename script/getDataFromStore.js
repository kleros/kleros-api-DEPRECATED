import Kleros from '../src/Kleros'
import Web3 from 'web3'
import {LOCALHOST_ETH_PROVIDER, LOCALHOST_STORE_PROVIDER} from '../constants'
import config from '../config'

let getDataFromStore = async () => {
  // use testRPC
  const ethProvider = await new Web3.providers.HttpProvider(LOCALHOST_ETH_PROVIDER)
  const storeProvider = LOCALHOST_STORE_PROVIDER

  let KlerosInstance = await new Kleros(ethProvider, storeProvider)
  const userAccount = KlerosInstance._web3Wrapper.getAccount(0)

  const httpResponse = await KlerosInstance.store.getUserProfile(userAccount)
  console.log(httpResponse)
}

getDataFromStore()
