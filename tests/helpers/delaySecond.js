const delaySecond = (seconds = 1) =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve(true)
    }, 1000 * seconds)
  })

export default delaySecond
