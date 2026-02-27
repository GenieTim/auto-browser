import asyncForEach from '../utils/async-foreach.js'

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
    // Find the form with the most fields to avoid submitting search forms
    const formWithMostFields = await driver.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'))
      if (forms.length === 0) return null

      // Count input fields in each form
      const formsWithCounts = forms.map((form, index) => {
        const fieldCount = form.querySelectorAll('input, textarea, select').length
        return {index, fieldCount, form}
      })

      // Sort by field count and return the index of the form with most fields
      formsWithCounts.sort((a, b) => b.fieldCount - a.fieldCount)
      return formsWithCounts[0].index
    })

    if (formWithMostFields === null) {
      this.logger.warn('No forms found on page')
      return
    }

    let possibleSelectors = ['input[type="submit"]', 'button[type="submit"]', 'button.nex-submit']

    let res = await asyncForEach(possibleSelectors, async (selector) => {
      // click selector if it exists within the target form
      try {
        // Get all matching buttons and find one within our target form
        const clicked = await driver.evaluate(
          (sel, formIndex) => {
            const forms = Array.from(document.querySelectorAll('form'))
            const targetForm = forms[formIndex]
            const buttons = Array.from(document.querySelectorAll(sel))

            for (const button of buttons) {
              if (targetForm.contains(button)) {
                button.click()
                return true
              }
            }
            return false
          },
          selector,
          formWithMostFields,
        )

        if (clicked) {
          return {break: true}
        }
      } catch (error) {
        // this.logger.warn(error)
      }
    })

    if (res === true) {
      return
    }

    // if we did not return yet, we have to query the form and invoke submit
    await driver.evaluate((formIndex) => {
      const forms = Array.from(document.querySelectorAll('form'))
      if (forms[formIndex]) {
        forms[formIndex].submit()
      }
    }, formWithMostFields)
  }
}

SubmitInstruction.identifier = 'submit'
SubmitInstruction.description = 'Submit a form'

// module.exports = SubmitInstruction
export default SubmitInstruction
