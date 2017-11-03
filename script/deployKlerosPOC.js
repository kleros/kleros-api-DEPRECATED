import Kleros from '../src/Kleros'
import Web3 from 'web3'
import contract from 'truffle-contract'
import {LOCALHOST_ETH_PROVIDER, LOCALHOST_STORE_PROVIDER, RNG_ADDRESS} from '../constants'
import config from '../config'

let court

let deployKlerosPOC = async () => {
  // use testRPC
  const provider = await new Web3.providers.HttpProvider(LOCALHOST_ETH_PROVIDER)
  const storeProvider = LOCALHOST_STORE_PROVIDER

  let KlerosInstance = await new Kleros(provider, storeProvider)

  const PNK = await KlerosInstance.pinakion.deploy()
  console.log('pinakion address: ', PNK.address)
  // const RNG = await KlerosInstance.rng.deploy()
  // console.log('rng address: ', RNG.address)
  court = await KlerosInstance.court
  const klerosCourt = await court.deploy(
    RNG_ADDRESS,
    PNK.address
  )
  console.log('Kleros POC court address: ', klerosCourt.address)
  const klerosSetHash = await KlerosInstance.pinakion.setKleros(PNK.address, klerosCourt.address)
  console.log("Kleros hash set")
  const ownershipSetHash = await KlerosInstance.pinakion.transferOwnership(PNK.address, klerosCourt.address)
  console.log("PNK ownership changed to kleros contract")
}

deployKlerosPOC()
