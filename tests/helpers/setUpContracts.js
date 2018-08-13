import BlockHashRNG from '../../src/contracts/implementations/RNG/BlockHashRNG'
import MiniMePinakion from '../../src/contracts/implementations/PNK/MiniMePinakion'
import TokenFactory from '../../src/contracts/implementations/PNK/TokenFactory'
import KlerosPOC from '../../src/contracts/implementations/arbitrator/KlerosPOC'
import MultipleArbitrableTransaction from '../../src/contracts/implementations/arbitrable/MultipleArbitrableTransaction'

const setUpContracts = async (
  provider,
  klerosPOCParams,
  arbitrableContractParams
) => {
  // initialize RNG
  const rngContract = await BlockHashRNG.deploy(
    klerosPOCParams.account,
    provider
  )
  // minime token
  const tokenFactory = await TokenFactory.deploy(
    klerosPOCParams.account,
    provider
  )
  const pnkContract = await MiniMePinakion.deploy(
    klerosPOCParams.account,
    provider,
    tokenFactory.address
  )
  // initialize KlerosPOC
  const klerosCourt = await KlerosPOC.deploy(
    rngContract.address,
    pnkContract.address,
    klerosPOCParams.timesPerPeriod,
    klerosPOCParams.account,
    klerosPOCParams.value,
    provider
  )
  const pinakionPOC = new MiniMePinakion(provider, pnkContract.address)
  // transfer ownership
  await pinakionPOC.changeController(
    klerosCourt.address,
    klerosPOCParams.account
  )
  const contractArbitrableTransaction = await MultipleArbitrableTransaction.deploy(
    arbitrableContractParams.partyA,
    provider
  )
  return [
    klerosCourt.address,
    contractArbitrableTransaction.address,
    rngContract.address,
    pnkContract.address
  ]
}

export default setUpContracts
