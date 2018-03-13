const PromiseQueue = () => {
  let promise = Promise.resolve()

  return {
    push: fn => {
      promise = promise.then(fn, fn)
    },
    fetch: fn => {
      let returnResolver
      const returnPromise = new Promise(resolve => {
        returnResolver = resolve
      })
      promise = promise.then(fn, fn).then(result => {
        returnResolver(result)
      })
      return returnPromise
    }
  }
}

export default PromiseQueue
