const setUpContracts = async (
  KlerosInstance,
  klerosPOCParams,
  arbitrableContractParams
) => {
  // initialize RNG and Pinakion contracts
  const rngInstance = new KlerosInstance.contracts.RNG.BlockHashRNG(
    KlerosInstance.getWeb3Wrapper()
  )
  const rng = await rngInstance.deploy()
  const pinakionInstance = new KlerosInstance.contracts.PNK.PinakionPOC(
    KlerosInstance.getWeb3Wrapper()
  )
  const pnk = await pinakionInstance.deploy()
  // initialize KlerosPOC
  const klerosCourt = await KlerosInstance.arbitrator.deploy(
    rng.address,
    pnk.address,
    klerosPOCParams.timesPerPeriod,
    klerosPOCParams.account,
    klerosPOCParams.value
  )

  // transfer ownership and set kleros instance
  await pinakionInstance.setKleros(pnk.address, klerosCourt.address)

  await pinakionInstance.transferOwnership(pnk.address, klerosCourt.address)

  const contractArbitrableTransaction = await KlerosInstance.arbitrableContracts.deploy(
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
    rng.address,
    pnk.address
  ]
}

export default setUpContracts
