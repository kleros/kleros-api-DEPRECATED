import PromiseQueue from '../../../src/utils/PromiseQueue'
import delaySecond from '../../helpers/delaySecond'

describe('PromiseQueue', () => {
  let promiseQueue

  beforeEach(() => {
    promiseQueue = new PromiseQueue()
  })

  it('queue keeps promises in order', async () => {
    const resolvedValues = []

    const promiseA = () =>
      new Promise(resolve => {
        setTimeout(() => {
          resolvedValues.push(1)
          resolve()
        }, 500)
      })

    const promiseB = () =>
      new Promise(resolve => {
        setTimeout(() => {
          resolvedValues.push(2)
          resolve()
        }, 100)
      })

    promiseQueue.push(promiseA)
    promiseQueue.push(promiseB)

    await delaySecond(1)
    expect(resolvedValues).toEqual([1, 2])
  })

  it('get return value from promise in queue', async () => {
    const resolvedValues = []

    const promiseA = () =>
      new Promise(resolve => {
        setTimeout(() => {
          resolvedValues.push(1)
          resolve(1)
        }, 100)
      })

    const promiseB = () =>
      new Promise(resolve => {
        setTimeout(() => {
          resolvedValues.push(2)
          resolve(2)
        }, 500)
      })

    const promiseC = () =>
      new Promise(resolve => {
        setTimeout(() => {
          resolvedValues.push(3)
          resolve(3)
        }, 100)
      })

    promiseQueue.push(promiseA)
    const result = await promiseQueue.fetch(promiseB)
    promiseQueue.push(promiseC)
    await delaySecond(2)
    expect(result).toEqual(2)
    expect(resolvedValues).toEqual([1, 2, 3])
  })
})
