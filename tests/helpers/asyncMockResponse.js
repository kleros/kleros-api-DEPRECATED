const asyncMockResponse = response =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve(response)
    }, 200)
  })

export default asyncMockResponse
