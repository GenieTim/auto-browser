import {input} from '@inquirer/prompts'
import replaceVariables from '../utils/replaceVariables.js'

/**
 * The goto/open/... URL in browser
 */
class GotoInstruction {
  /**
   * Run/Execute/Follow this instruction
   *
   * @param {object} instruction the instructions, as created by createInteractively()
   * @param {module.puppeteer.Browser} driver the browser to execute upon
   * @param {object} _ an object to populate/read from to exchange data between instructions
   */
  async follow(instruction, driver, _) {
    const target = replaceVariables(instruction)
    await driver.goto(target)
  }

  /**
   * Create this instruction by requesting data from the user via CI
   */
  async createInteractively() {
    return input({message: 'Where would you like to go?'})
  }
}

GotoInstruction.identifier = 'goto'
GotoInstruction.description = 'Open an URL'

// module.exports = GotoInstruction
export default GotoInstruction
