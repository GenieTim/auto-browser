const {cli} = require('cli-ux')
const inquirer = require('inquirer')
const sandman = require('../utils/sandman')

/**
 * Wait for user to do something
 */
class UserWaitInstruction {
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
    this.logger.log('Waiting for user input!')
    if (instruction.end === 'Navigation') {
      await driver.waitForNavigation({
        timeout: 600000, // 10 min
      })
    } else if (instruction.end === 'CI-Enter') {
      await cli.confirm('User input finished?')
    } else {
      this.logger.warn('Unrecognized user input waiter. Waiting a generic minute...')
      await sandman.sleep(60000)
    }
  }

  /**
   * Create this instruction by requesting data from the user via CI
   */
  async createInteractively() {
    let answers = await inquirer.prompt([{
      type: 'list',
      name: 'end',
      message: 'How do you want the instruction to end?',
      choices: ['Navigation', 'CI-Enter'],
    }])

    return {
      end: answers.end,
    }
  }
}

UserWaitInstruction.identifier = 'user-wait'
UserWaitInstruction.description = 'Wait for user to do something in the browser'

module.exports = UserWaitInstruction
