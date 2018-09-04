import BlockHashRNG from '../../src/contracts/implementations/RNG/BlockHashRNG'
import MiniMePinakion from '../../src/contracts/implementations/PNK/MiniMePinakion'
import TokenFactory from '../../src/contracts/implementations/PNK/TokenFactory'
import KlerosPOC from '../../src/contracts/implementations/arbitrator/KlerosPOC'
import ArbitrableTransaction from '../../src/contracts/implementations/arbitrable/ArbitrableTransaction'

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
  console.log(klerosCourt.address)

  const contractArbitrableTransaction = await ArbitrableTransaction.deploy(
    arbitrableContractParams.partyA,
    arbitrableContractParams.value,
    klerosCourt.address,
    arbitrableContractParams.timeout,
    arbitrableContractParams.partyB,
    arbitrableContractParams.extraData,
    arbitrableContractParams.metaEvidenceUri,
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
