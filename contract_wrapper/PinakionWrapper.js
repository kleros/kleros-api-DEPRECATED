import * as _ from 'lodash'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import PinakionPOC from 'kleros/build/contracts/PinakionPOC' // FIXME mock
import config from '../config'

/**
 * Kleros API
 */
class PinakionWrapper extends ContractWrapper {
  /**
   * Constructor Kleros.
   * @param web3 instance
   * @param address of the contract (optionnal)
   */
  constructor(web3Provider, storeProvider, address) {
    super(web3Provider, storeProvider)
    if (!_.isUndefined(address)) {
      this.address = address
    }
    this.contractInstance = null
  }

  /**
   * Kleros deploy.
   * @param   account (default: accounts[0])
   * @return  truffle-contract Object | err The contract object or error deploy
   */
  deploy = async (
      account = this._Web3Wrapper.getAccount(0),
    ) => {

    const contractDeployed = await this._deployAsync(
      account,
      config.value,
      PinakionPOC
    )

    this.address = contractDeployed.address

    return contractDeployed
  }

  /**
   * Load an existing contract
   * @param address contract address
   * @return Conract Instance | Error
   */
  load = async (
    address
  ) => {
    try {
      const contractInstance = await this._instantiateContractIfExistsAsync(PinakionPOC, address)
      this.contractInstance = contractInstance
      this.address = address

      return contractInstance
    } catch (e) {
      throw new Error(e)
    }
  }

  setKleros = async (
    contractAddress,
    klerosAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    let txHashObj
    try {
      let contractInstance = await this.load(contractAddress)
      txHashObj = await contractInstance.setKleros(
        klerosAddress,
        {
          from: account,
          gas: config.GAS,
        }
      )
    } catch (e) {
      throw new Error(e)
    }

    return txHashObj.tx
  }

  transferOwnership = async (
    contractAddress,
    klerosAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    try {
      let contractInstance = await this.load(contractAddress)
      const txHashObj = await contractInstance.transferOwnership(
        klerosAddress,
        {
          from: account,
          gas: config.GAS,
        }
      )
    } catch (e) {
      throw new Error(e)
    }

    return txHashObj.tx
  }

  getData = async (
    contractAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    const contractInstance = await this.load(contractAddress)

    const [
      owner,
      kleros
    ] = await Promise.all([
      contractInstance.owner.call(),
      contractInstance.kleros.call()
    ]).catch(err => {
      throw new Error(err)
    })

    return {
      owner,
      kleros
    }
  }
}

export default PinakionWrapper
