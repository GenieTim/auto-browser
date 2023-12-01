/* eslint-disable no-unused-vars */
/**
 * DO NOT USE THIS CLASS
 * it serves only educational purposes,
 * including the required functions
 */
class AbstractInstruction {
  /**
   * Run/Execute/Follow this instruction
   *
   * @param {object} instruction the instructions, as created by createInteractively()
   * @param {module.puppeteer.Browser} driver the browser to execute upon
   * @param {object} context an object to populate/read from to exchange data between instructions
   */
  async follow(instruction, driver, context) {}

  /**
   * Create this instruction by requesting data from the user via CI
   */
  async createInteractively() {}
}

AbstractInstruction.identifier = 'abstract'
AbstractInstruction.description = 'Test'

// module.exports = AbstractInstruction
export default AbstractInstruction
