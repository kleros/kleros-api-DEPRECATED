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

  const pnkContractDeployed = await KlerosInstance.pinakion.deploy()
  console.log('pinakion address: ', pnkContractDeployed.address)
  const rngContractDeployed = await KlerosInstance.rng.deploy()
  console.log('rng address: ', rngContractDeployed.address)
  court = await KlerosInstance.court
  const klerosCourt = await court.deploy(
    rngContractDeployed.address,
    pnkContractDeployed.address
  )
  console.log('Kleros POC court address: ', klerosCourt.address)
  const klerosSetHash = await KlerosInstance.pinakion.setKleros(pnkContractDeployed.address, klerosCourt.address)
  console.log("Kleros hash set")
  const ownershipSetHash = await KlerosInstance.pinakion.transferOwnership(pnkContractDeployed.address, klerosCourt.address)
  console.log("PNK ownership changed to kleros contract")
}

deployKlerosPOC()
