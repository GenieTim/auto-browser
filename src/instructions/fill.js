const { cli } = require('cli-ux')
const asyncForEach = require('../utils/async-foreach')

/**
 * Fill form fields
 */
class FillInstruction {
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
    // throws:
    await this.fillFields(instruction, driver)
  }

  /**
   * Create this instruction by requesting data from the user via CI
   */
  async createInteractively() {
    let fields = []
    let addNew = true
    while (addNew) {
      let field = {}
      let selector = await cli.prompt('What is the field\'s selector?')
      let text = await cli.prompt('What should be filled in?')
      field[selector] = text
      fields.push(field)
      addNew = await cli.confirm('Add another field?')
    }
    return fields
  }

  /**
   * Fill in some (form) fields
   *
   * @param {array} fields the fields to fill in. Array of objects.
   * Every object has selector as key, value is the text to fill in
   * @param {module.puppeteer.Browser} driver the browser to execute upon
   */
  async fillFields(fields, driver) {
    // loop fields array
    await asyncForEach(fields, async field => {
      // find selectors for this field collection
      let fieldSelectors = Object.keys(field)
      // loop selectors
      await asyncForEach(fieldSelectors, async selector => {
        selector = this.adjustSelector(selector)
        // select each field & type what is recommended
        if (selector.startsWith('select')) {
          // rudimentary check to act differently on <select><option>...
          await driver.select(selector, field[fieldSelectors])
        } else {
          // first, clear form field
          try {
            await driver.evaluate(selector => {
              // eslint-disable-next-line no-undef
              document.querySelector(selector).value = ''
            }, selector)
          } catch (e) {
            this.logger.warn("Failed to empty input with selector " + selector)
          }
          // then, type value
          await driver.type(selector, field[fieldSelectors])
        }
      })
    })
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
      this.logger.error(error)
    }
    return selector
  }
}

FillInstruction.identifier = 'fill'
FillInstruction.description = 'Fill in form fields'

module.exports = FillInstruction
