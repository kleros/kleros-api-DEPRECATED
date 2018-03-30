import { MISSING_PARAMETERS } from '../constants/error'

const isRequired = name => {
  throw new Error(MISSING_PARAMETERS(name))
}

export default isRequired
