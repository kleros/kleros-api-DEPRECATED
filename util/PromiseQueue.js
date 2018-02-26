const PromiseQueue = () => {
  let promise = Promise.resolve()

  return {
    push: (fn) => {
      promise = promise.then(fn, fn)
      return this
    }
  }
}

export default PromiseQueue
