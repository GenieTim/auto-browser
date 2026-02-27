import {input, confirm} from '@inquirer/prompts'
import replaceVariables from '../utils/replaceVariables.js'

/**
 * Wait for an element to appear or condition to be met
 */
class WaitForInstruction {
  /**
   * Instantiate this class
   *
   * @param {Object} logger an instance of a class with methods: log, warn, error
   */
  constructor(logger) {
    this.logger = logger
  }

  /**
   * Run/Execute/Follow this instruction
   *
   * @param {object} instruction the instructions, as created by createInteractively()
   * @param {module.puppeteer.Browser} driver the browser to execute upon
   * @param {object} _ an object to populate/read from to exchange data between instructions
   */
  async follow(instruction, driver, _) {
    const {selector, timeout = 30000, visible = false} = instruction
    const adjustedSelector = replaceVariables(selector)

    try {
      this.logger.log(`Waiting for ${adjustedSelector}${visible ? ' to be visible' : ''}...`)
      await driver.waitForSelector(adjustedSelector, {
        timeout,
        visible,
      })
      this.logger.log(`Element ${adjustedSelector} found`)
    } catch (error) {
      this.logger.warn(`Timeout waiting for ${adjustedSelector}: ${error.message}`)
      throw error
    }
  }

  /**
   * Create this instruction by requesting data from the user via CI
   */
  async createInteractively() {
    const selector = await input({message: 'What selector should we wait for?'})
    const visible = await confirm({message: 'Wait for it to be visible?'})
    const timeout = await input({message: 'Timeout in milliseconds?', default: '30000'})

    return {
      selector,
      visible,
      timeout: parseInt(timeout, 10),
    }
  }
}

WaitForInstruction.identifier = 'wait-for'
WaitForInstruction.description = 'Wait for an element to appear on the page'

export default WaitForInstruction
