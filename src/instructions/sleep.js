const {cli} = require('cli-ux')
const sandman = require('../utils/sandman')

/**
 * The click selector in browser
 */
class SleepInstruction {
  /**
   * Run/Execute/Follow this instruction
   *
   * @param {object} instruction the instructions, as created by createInteractively()
   * @param {module.puppeteer.Browser} _ the browser to execute upon
   * @param {object} context an object to populate/read from to exchange data between instructions
   */
  async follow(instruction, _, context) {
    await sandman.sleep(instruction)
    context.timeWastedSleeping += instruction
  }

  /**
   * Create this instruction by requesting data from the user via CI
   */
  async createInteractively() {
    return cli.prompt('How many miliseconds do you want the browser to sleep?')
  }
}

SleepInstruction.identifier = 'sleep'
SleepInstruction.description = 'Sleep for some time'

module.exports = SleepInstruction
