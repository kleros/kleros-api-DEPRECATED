import _ from 'lodash'

/**
 * delegate calls from a baseClass to a providerClass if the call does not exist in base class
 * @param {object} baseClass - The base object that has first priority to make calls
 * @param {object} providerClass - The class whose methods will be called by baseClass
 * @param {function} middlewareCall - <optional> Middleware function that can act as
 * intermediary between base and provider. Should take a two params which is the provider
 * classes method call and the params passed
 */
const delegateCalls = (baseClass, providerClass, middlewareCall) => {
  // we don't want to delegate any calls that are part of the base class
  const existingMethods = Object.getOwnPropertyNames(baseClass).concat(
    Object.getPrototypeOf(baseClass)
  )
  // methods of provider
  const providerMethods = Object.getOwnPropertyNames(providerClass)
  // calls we will delegate
  const delegatableMethods = providerMethods.filter(method => {
    if (
      !providerClass.hasOwnProperty(method) ||
      typeof providerClass[method] !== 'function'
    ) {
      return false
    }

    return !_.includes(existingMethods, method)
  })

  // delegate calls in baseClass
  delegatableMethods.forEach(methodName => {
    let curriedCall
    if (middlewareCall)
      curriedCall = (...args) =>
        middlewareCall(providerClass[methodName], ...args)
    else curriedCall = (...args) => providerClass[methodName](...args)
    // set method in baseClass
    baseClass[methodName] = curriedCall
  })
}

export default delegateCalls
