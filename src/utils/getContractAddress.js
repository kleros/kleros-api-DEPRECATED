import ethUtil from 'ethereumjs-util'

const getContractAddress = (account, nonce) =>
  ethUtil.bufferToHex(ethUtil.generateAddress(account, nonce))

export default getContractAddress
