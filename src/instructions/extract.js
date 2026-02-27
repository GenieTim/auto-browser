import {input} from '@inquirer/prompts'

/**
 * Extract/capture data from the page and store in context
 */
class ExtractInstruction {
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
   * @param {object} context an object to populate/read from to exchange data between instructions
   */
  async follow(instruction, driver, context) {
    const {selector, attribute, contextKey} = instruction

    try {
      let value
      if (attribute === 'text' || !attribute) {
        // Extract text content
        value = await driver.$eval(selector, el => el.textContent.trim())
      } else if (attribute === 'value') {
        // Extract input value
        value = await driver.$eval(selector, el => el.value)
      } else {
        // Extract specific attribute
        value = await driver.$eval(selector, (el, attr) => el.getAttribute(attr), attribute)
      }

      const key = contextKey || 'extractedValue'
      context[key] = value
      this.logger.log(`Extracted "${value}" from ${selector} and stored in context.${key}`)
    } catch (error) {
      this.logger.warn(`Failed to extract data from ${selector}: ${error.message}`)
      throw error
    }
  }

  /**
   * Create this instruction by requesting data from the user via CI
   */
  async createInteractively() {
    const selector = await input({message: 'What is the selector to extract data from?'})
    const attribute = await input({
      message: 'What attribute to extract? (text/value/href/etc, leave empty for text)',
      default: 'text',
    })
    const contextKey = await input({
      message: 'What context key to store the value under?',
      default: 'extractedValue',
    })

    return {
      selector,
      attribute: attribute || 'text',
      contextKey,
    }
  }
}

ExtractInstruction.identifier = 'extract'
ExtractInstruction.description = 'Extract data from the page and store in context for later use'

export default ExtractInstruction
