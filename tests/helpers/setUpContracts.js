import BlockHashRNG from '../../src/contracts/implementations/RNG/BlockHashRNG'
import PinakionPOC from '../../src/contracts/implementations/PNK/PinakionPOC'
import KlerosPOC from '../../src/contracts/implementations/arbitrator/KlerosPOC'
import ArbitrableTransaction from '../../src/contracts/implementations/arbitrable/ArbitrableTransaction'

const setUpContracts = async (
  provider,
  klerosPOCParams,
  arbitrableContractParams
) => {
  // initialize RNG and Pinakion contracts
  const rngInstance = await BlockHashRNG.deploy(
    klerosPOCParams.account,
    provider
  )
  const pinakionInstance = await PinakionPOC.deploy(
    klerosPOCParams.account,
    provider
  )
  // initialize KlerosPOC
  const klerosCourt = await KlerosPOC.deploy(
    rngInstance.address,
    pinakionInstance.address,
    klerosPOCParams.timesPerPeriod,
    klerosPOCParams.account,
    klerosPOCParams.value,
    provider
  )
  const pnkWrapper = new PinakionPOC(provider, pinakionInstance.address)
  // transfer ownership and set kleros instance
  await pnkWrapper.setKleros(klerosCourt.address, klerosPOCParams.account)
  await pnkWrapper.transferOwnership(
    klerosCourt.address,
    klerosPOCParams.account
  )
  const contractArbitrableTransaction = await ArbitrableTransaction.deploy(
    arbitrableContractParams.partyA,
    arbitrableContractParams.value, // use default value (0)
    arbitrableContractParams.hash,
    klerosCourt.address,
    arbitrableContractParams.timeout,
    arbitrableContractParams.partyB,
    arbitrableContractParams.extraData,
    provider
  )
  return [
    klerosCourt.address,
    contractArbitrableTransaction.address,
    rngInstance.address,
    pinakionInstance.address
  ]
}

export default setUpContracts
