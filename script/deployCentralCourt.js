import Kleros from '../src/Kleros'
import Web3 from 'web3'
import contract from 'truffle-contract'
import {LOCALHOST_PROVIDER} from '../constants'
import config from '../config'

let centralCourt

let deployCentralCourt = async () => {
  // use testRPC
  const provider = await new Web3.providers.HttpProvider(LOCALHOST_PROVIDER)
  console.log(provider)

  let KlerosInstance = await new Kleros(provider)
  console.log("waht")

  centralCourt = await KlerosInstance.centralCourt

  let centralCourtDeployed = await centralCourt.deploy()

  console.log('addressCentralCourtDeployed: ', centralCourtDeployed.address)
}

deployCentralCourt()
