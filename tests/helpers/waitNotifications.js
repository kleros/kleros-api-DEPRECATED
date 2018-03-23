const waitNotifications = (initialAmount = undefined, notificationCallback) => {
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

export default waitNotifications
