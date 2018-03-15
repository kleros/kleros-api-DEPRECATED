const PromiseQueue = () => {
  let promise = Promise.resolve()

  return {
    push: fn => {
      promise = promise.then(fn, fn)
    },
    fetch: fn => {
      let returnResolver
      let returnRejecter
      const returnPromise = new Promise((resolve, reject) => {
        returnResolver = resolve
        returnRejecter = reject
      })
      promise = promise
        .then(fn, fn)
        .then(res => returnResolver(res), err => returnRejecter(err))

      return returnPromise
    }
  }
}

export default PromiseQueue
