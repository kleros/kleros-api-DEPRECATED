import Kleros from '../src/Kleros'
import Web3 from 'web3'
import contract from 'truffle-contract'
import {LOCALHOST_ETH_PROVIDER, LOCALHOST_STORE_PROVIDER} from '../constants'
import config from '../config'

let court

let deployKlerosPOC = async () => {
  // use testRPC
  const provider = await new Web3.providers.HttpProvider(LOCALHOST_ETH_PROVIDER)
  const storeProvider = LOCALHOST_STORE_PROVIDER

  let KlerosInstance = await new Kleros(provider, storeProvider)

  court = await KlerosInstance.centralCourt

  let klerosCourt = await court.deploy()

  console.log('Kleros POC court address: ', klerosCourt.address)
}

deployKlerosPOC()
