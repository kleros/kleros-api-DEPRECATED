const setUpContracts = async (
  KlerosInstance,
  klerosPOCParams,
  arbitrableContractParams
) => {
  // initialize RNG and Pinakion contracts
  const rngInstance = await KlerosInstance.blockHashRng.deploy(undefined)

  const pinakionInstance = await KlerosInstance.pinakion.deploy()

  // initialize KlerosPOC
  const klerosCourt = await KlerosInstance.klerosPOC.deploy(
    rngInstance.address,
    pinakionInstance.address,
    klerosPOCParams.timesPerPeriod,
    klerosPOCParams.account,
    klerosPOCParams.value
  )

  // transfer ownership and set kleros instance
  await KlerosInstance.pinakion.setKleros(
    pinakionInstance.address,
    klerosCourt.address
  )

  await KlerosInstance.pinakion.transferOwnership(
    pinakionInstance.address,
    klerosCourt.address
  )

  const contractArbitrableTransaction = await KlerosInstance.arbitrableTransaction.deploy(
    arbitrableContractParams.partyA,
    arbitrableContractParams.value, // use default value (0)
    arbitrableContractParams.hash,
    klerosCourt.address,
    arbitrableContractParams.timeout,
    arbitrableContractParams.partyB,
    arbitrableContractParams.extraData
  )

  return [
    klerosCourt.address,
    contractArbitrableTransaction.address,
    rngInstance.address,
    pinakionInstance.address
  ]
}

export default setUpContracts
