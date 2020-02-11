const {cli} = require('cli-ux')
const asyncForEach = require('../utils/async-foreach')

/**
 * The click selector in browser
 */
class ClickInstruction {
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
    if (instruction instanceof Object) {
      return this.clickMultiple(instruction, driver)
    }
    return this.clickOne(instruction, driver)
  }

  /**
   * Create this instruction by requesting data from the user via CI
   */
  async createInteractively() {
    return cli.prompt('What is the selector of what to click?')
  }

  /**
   * Click elements in case of a
   *
   * @param {object} instruction more detailed instruction
   * @param {module.puppeteer.Browser} driver the page to click in
   */
  async clickMultiple(instruction, driver) {
    let elements = await driver.$$(instruction.selector)
    switch (instruction.multiple) {
    case 'last':
      await elements[elements.length - 1].click()
      break
    case 'first':
      await elements[0].click()
      break
    case 'all':
      await asyncForEach(elements, async element => {
        await element.click()
      })
    }
  }

  /**
   * Click only one element
   *
   * @param {string} selector the DOM selector
   * @param {module.puppeteer.Browser} driver the browser page to execute upon
   */
  async clickOne(selector, driver) {
    selector = this.adjustSelector(selector)
    try {
      let element = driver.$(selector)
      // prevent all possible tab juggling until there are appropriate instructions
      await driver.evaluateHandle(element => {
        element.target = '_self'
      })
      await element.click()
    } catch (error) {
      try {
        await driver.evaluate(selector => {
          // eslint-disable-next-line no-undef
          return Promise.resolve(document.querySelector(selector).click())
        }, selector)
      } catch (error) {
        throw error
      }
    }
  }

  /**
   * Hacky temporary adjustment for some ideas
   *
   * @todo outsource to its own instructionset
   * @param {string} selector the selector to adjust
   * @returns {string} the adjusted string/selector
   */
  adjustSelector(selector) {
    try {
      let today = new Date()
      selector = selector.replace('$today', today.getDate())
    } catch (error) {
      this.logger.warn(error)
    }
    return selector
  }
}

ClickInstruction.identifier = 'click'
ClickInstruction.description = 'Click on something'

module.exports = ClickInstruction
