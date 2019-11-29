const {cli} = require('cli-ux')

/**
 * The click selector in browser
 */
class ClickInstruction {
  /**
   * Run/Execute/Follow this instruction
   *
   * @param {object} instruction the instructions, as created by createInteractively()
   * @param {module.puppeteer.Browser} driver the browser to execute upon
   * @param {object} _ an object to populate/read from to exchange data between instructions
   */
  async follow(instruction, driver, _) {
    await driver.click(instruction)
  }

  /**
   * Create this instruction by requesting data from the user via CI
   */
  async createInteractively() {
    return cli.prompt('What is the selector of what to click?')
  }
}

ClickInstruction.identifier = 'click'
ClickInstruction.description = 'Click on something'

module.exports = ClickInstruction
