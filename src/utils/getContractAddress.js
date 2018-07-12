import ethUtil from 'ethereumjs-util'

const getContractAddress (account, Web3Wrapper) => {
  const currentNonce = Web3Wrapper.getNonce(account)
  return ethUtil.bufferToHex(ethUtil.generateAddress(account, currentNonce))
}
