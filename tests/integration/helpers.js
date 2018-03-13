export const setUpContracts = async (
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

  const contractArbitrableTransaction = await KlerosInstance.arbitrableContract.deployContract(
    arbitrableContractParams.partyA,
    arbitrableContractParams.value, // use default value (0)
    arbitrableContractParams.hash,
    klerosCourt.address,
    arbitrableContractParams.timeout,
    arbitrableContractParams.partyB,
    arbitrableContractParams.extraData,
    arbitrableContractParams.email,
    arbitrableContractParams.title,
    arbitrableContractParams.description
  )

  return [
    klerosCourt.address,
    contractArbitrableTransaction.address,
    rngInstance.address,
    pinakionInstance.address
  ]
}

export const waitNotifications = (
  initialAmount = undefined,
  notificationCallback
) => {
  let amount
  let currentAmount = 0
  let notificationList = []
  let resolver
  let promise = new Promise(resolve => {
    resolver = resolve
  })
  let callback = notification => {
    notificationCallback(notification)
    notificationList.push(notification)
    currentAmount += 1
    if (typeof amount !== 'undefined' && currentAmount >= amount)
      resolver(notificationList)
  }
  let setAmount = n => {
    amount = n
    if (currentAmount >= amount) resolver(notificationList)
  }
  if (typeof initialAmount !== 'undefined') setAmount(initialAmount)

  return { promise, callback, setAmount }
}
