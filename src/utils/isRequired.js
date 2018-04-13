import { MISSING_PARAMETERS } from '../constants/error'

/**
 * Used as the default parameter for an arguemnt that is considered required. It will
 * throw an error if the argument is not supplied by the user.
 * @param {string} name - The name of the missing argument.
 */
const isRequired = name => {
  throw new Error(MISSING_PARAMETERS(name))
}

export default isRequired
