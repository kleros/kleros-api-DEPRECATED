import Web3 from 'web3'

const parse = (type, name, value) => {
  const parsers = {
    // Types
    types: {
      uint8: v => v.toNumber(),
      uint256: v => v.toNumber(),
    },
    // Names
    names: {
      partyAFee: v => Web3.fromWei(v, 'ether'),
      partyBFee: v => Web3.fromWei(v, 'ether'),
    }
  }

  let result = value
  if (parsers.types[type]) result = parsers.types[type](result)
  if (parsers.names[name]) result = parsers.types[name](result)
  return result
}

export function setABIGetters(context, abiArray) {
  abiArray.filter(abi => abi.type === 'function').forEach(abi => {

    context[abi.name] = async address => {
      const instance = await context.load(address)

      let result = await instance[abi.name].call()

      return abi.outputs.length === 1 ? parse(abi.outputs[0].type, abi.name, result) : abi.outputs.map(({ type }, i) => parse(type, abi.name, result[i]))
    }
  })
}