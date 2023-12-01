
import fs from 'fs'
import path from 'path'
import { ux } from '@oclif/core'

const cli = ux;
import asyncForEach from '../utils/async-foreach.js'
import {URL} from 'url'
const __filename = new URL('', import.meta.url).pathname
const __dirname = new URL('.', import.meta.url).pathname

/**
 * Fill form fields based on
 */
class FillCleverlyInstruction {
  /**
   * Instantiate this class
   *
   * @param {Object} logger an instance of a class with methods: log, warn, error
   */
  constructor(logger) {
    this.logger = logger
    this.globalFields = []
    this.globalFieldsFile = path.join(__dirname, '../../global-fields.json')
    if (fs.existsSync(this.globalFieldsFile)) {
      this.globalFields = JSON.parse(
        fs.readFileSync(this.globalFieldsFile, 'utf8'),
      )
    }
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
    let addNew = await cli.confirm('Add another field to the global config?')
    while (addNew) {
      let selector = await cli.prompt("What is the field's selector?")
      let text = await cli.prompt('What should be filled in?')
      let field = {
        selectors: [selector],
        text: text,
      }
      this.globalFields.push(field)
      addNew = await cli.confirm('Add another field to the global config?')
      fs.writeFileSync(this.globalFieldsFile, JSON.stringify(this.globalFields))
    }

    return []
  }

  /**
   * Fill in some (form) fields
   *
   * @param {array} fields an empty array for now giving the config
   * @param {module.puppeteer.Browser} driver the browser to execute upon
   */
  async fillFields(fields, driver) {
    // loop fields array
    await asyncForEach(this.globalFields, async field => {
      // find selectors for this field collection
      let fieldSelectors = this.blowSelectorsUp(field.selectors)
      // loop selectors
      await asyncForEach(fieldSelectors, async selector => {
        selector = this.adjustSelector(selector)
        if (await driver.$eval(selector, () => true).catch(() => false)) {
          try {
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
              } catch (error) {
                this.logger.warn(
                  'Failed to empty input with selector ' +
                    selector +
                    '. Error: ' +
                    error,
                )
              }

              // then, type value
              await driver.type(selector, field.text)
            }
          } catch (error) {
            this.logger.warn(
              'Failed to fill fields for selector ' +
                selector +
                '. Error: ' +
                error,
            )
          }
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
      selector = selector.replace('$today', today.getDate().toString())
    } catch (error) {
      this.logger.error(error)
    }

    return selector
  }

  blowSelectorsUp(selectors) {
    for (let selector of selectors) {
      if (
        !selector.includes(' ') &&
        !selector.includes('.') &&
        !selector.includes('#') &&
        !selector.includes('"')
      ) {
        selectors.push(
          '#' + selector,
          '#' + selector + '*',
          '.' + selector,
          '[name="' + selector + '"]',
        )
      }
    }

    return selectors
  }
}

FillCleverlyInstruction.identifier = 'cleverfill'
FillCleverlyInstruction.description =
  'Fill in form fields based on global information'

// module.exports = FillCleverlyInstruction
export default FillCleverlyInstruction
