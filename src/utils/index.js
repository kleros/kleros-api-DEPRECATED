import Web3 from 'web3'

const Parsers = {
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

export function setABIGetters(context, abiArray) {
  abiArray.filter(abi => abi.type === 'function').forEach(abi => {

    context[abi.name] = async address => {
      const instance = await context.load(address)

      let result = await instance[abi.name].call()

      if(abi.outputs.length === 1) {
        const output = abi.outputs[0]

        result = Parsers.types[output.type] && Parsers.types[output.type](result)

        result = Parsers.names[abi.name] && Parsers.names[abi.name](result)
      }
      else {
        // FIXME: do we need to handle multiple outputs?
      }

      return result
    }
  })
}