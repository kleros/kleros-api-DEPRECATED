import * as _ from 'lodash'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import RNG from 'kleros-interaction/build/contracts/ConstantNG'
import config from '../config'

/**
 * Kleros API
 */
class ConstantNGWrapper extends ContractWrapper {
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
   * @param   value (default: 10000)
   * @return  truffle-contract Object | err The contract object or error deploy
   */
  deploy = async (
      account = this._Web3Wrapper.getAccount(0),
      constant = 23 // constant that it always returns
    ) => {

    const contractDeployed = await this._deployAsync(
      account,
      config.value,
      RNG,
      constant
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
      const contractInstance = await this._instantiateContractIfExistsAsync(RNG, address)
      this.contractInstance = contractInstance
      this.address = address
      return contractInstance
    } catch (e) {
      throw new Error(e)
    }
  }

  getData = async (
    contractAddress,
    account = this._Web3Wrapper.getAccount(0)
  ) => {
    const contractInstance = await this.load(contractAddress)

    const [
      number
    ] = await Promise.all([
      contractInstance.number.call()
    ]).catch(err => {
      throw new Error(err)
    })

    return {
      number: number.toNumber()
    }
  }
}

export default ConstantNGWrapper
