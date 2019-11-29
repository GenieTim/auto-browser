const {cli} = require('cli-ux')
const asyncForEach = require('../utils/async-foreach')

/**
 * Fill form fields
 */
class FillInstruction {
  /**
   * Run/Execute/Follow this instruction
   *
   * @param {object} instruction the instructions, as created by createInteractively()
   * @param {module.puppeteer.Browser} driver the browser to execute upon
   * @param {object} _ an object to populate/read from to exchange data between instructions
   */
  async follow(instruction, driver, _) {
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
        // select each field & type what is recommended
        await driver.type(selector, field[fieldSelectors])
      })
    })
  }
}

FillInstruction.identifier = 'fill'
FillInstruction.description = 'Fill in form fields'

module.exports = FillInstruction
