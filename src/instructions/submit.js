import asyncForEach from '../utils/async-foreach.js'
import {ux} from '@oclif/core'
const cli = ux

/**
 * Submit a form
 */
class SubmitInstruction {
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
    return this.submitForm(instruction, driver)
  }

  /**
   * Create this instruction by requesting data from the user via CI
   */
  async createInteractively() {
    return {}
  }

  /**
   * (Try to) submit the form
   *
   * @param {object} empty the instruction
   * @param {module.puppeteer.Browser} driver the browser page to execute upon
   */
  async submitForm(empty, driver) {
    let possibleSelectors = ['input[type="submit"]', 'button[type="submit"]', 'button.nex-submit']

    let res = asyncForEach(possibleSelectors, async (selector) => {
      // click selector if it exists
      try {
        // this.logger.log('Trying to submit form with selector:' + selector)
        await driver.click(selector)
        return {break: true}
      } catch (error) {
        // this.logger.warn(error)
      }
    })

    if (res == true) {
      return
    }

    // if we did not return yet, we have to query the form and invoke submit
    await driver.evaluate(() => {
      let form = document.querySelector('form')
      form.submit()
    })
  }
}

SubmitInstruction.identifier = 'submit'
SubmitInstruction.description = 'Submit a form'

// module.exports = SubmitInstruction
export default SubmitInstruction
