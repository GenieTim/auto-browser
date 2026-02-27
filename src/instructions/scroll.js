import {input, select} from '@inquirer/prompts'
import replaceVariables from '../utils/replaceVariables.js'
/**
 * The click selector in browser
 */
class ScrollInstruction {
  /**
   * Run/Execute/Follow this instruction
   *
   * @param {object} instruction the instructions, as created by createInteractively()
   * @param {module.puppeteer.Browser} driver the browser to execute upon
   * @param {object} _ an object to populate/read from to exchange data between instructions
   */
  async follow(instruction, driver, _) {
    this.driver = driver
    if (this.extractProperty(instruction, 'bottom', false)) {
      await this.scrollToBottom(instruction)
    }

    if (this.extractProperty(instruction, 'selector', false)) {
      await this.scrollTo(instruction.selector)
    }
  }

  /**
   * Create this instruction by requesting data from the user via CI
   */
  async createInteractively() {
    let distance = await select({
      message: 'How far would you like to scroll?',
      choices: [{value: 'To bottom'}, {value: 'To selector'}],
    })
    if (distance === 'To selector') {
      return {
        selector: await input({message: 'What is the selector of where to scroll?'}),
      }
    }

    return {bottom: true}
  }

  async scrollTo(selector) {
    selector = replaceVariables(selector)
    await this.driver.$eval(selector, (e) => {
      e.scrollIntoView({behavior: 'smooth', block: 'end', inline: 'end'})
    })
  }

  async scrollToBottom(options) {
    let distance = this.extractProperty(options, 'distance', 100) // should be less than or equal to window.innerHeight
    let delay = this.extractProperty(options, 'delay', 7)
    await this.driver.evaluate(async () => {
      await new Promise((resolve) => {
        const timer = setInterval(() => {
          // eslint-disable-next-line no-undef
          document.scrollingElement.scrollBy(0, distance)
          // eslint-disable-next-line no-undef
          if (document.scrollingElement.scrollTop + window.innerHeight >= document.scrollingElement.scrollHeight) {
            clearInterval(timer)
            resolve()
          }
        }, delay)
      })
    })
  }

  extractProperty(object, property, defaultValue = null) {
    return Object.prototype.hasOwnProperty.call(object, property) ? object[property] : defaultValue
  }
}

ScrollInstruction.identifier = 'scroll'
ScrollInstruction.description = 'Scroll somewhere'

// module.exports = ScrollInstruction
export default ScrollInstruction
