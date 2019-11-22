const {Command, flags} = require('@oclif/command')
const fs = require('fs')
const path = require('path')
const asyncForEach = require('../utils/async-foreach')
const puppeteer = require('puppeteer')
const sandman = require('../utils/sandman')
const executeFunctionByName = require('../utils/execute-function-by-name')

// find all available pages
let localAvailablePages = []
fs.readdirSync(path.join(__dirname, '../../webpages')).forEach(file => {
  localAvailablePages.push(file)
})
const availablePages = localAvailablePages

class BrowseCommand extends Command {
  async run() {
    const {argv, flags} = this.parse(BrowseCommand)
    this.debug = flags.debug

    let files = argv
    if (files.length === 0) {
      files = availablePages
    }

    await asyncForEach(files, async page => {
      await this.initializeBrowser()
      try {
        await this.runPage(page)
      } catch (error) {
        // catch errors top-level to cancel pages on error
        this.warn('Failed to process page: ' + page + '. Error: ' + error)
        this.destroy()
      }
    })
  }

  /**
   * Set up the browser
   */
  async initializeBrowser() {
    const browser = await puppeteer.launch({
      headless: !this.debug,
      userDataDir: './user_data',
    })
    try {
      this.driver = await browser.newPage()
    } catch (error) {
      this.logger.error(error)
      return
    }
    if (this.debug) {
      this.driver.setViewport({width: 0, height: 0})
    }
  }

  /**
   * Reset this instance
   */
  destroy() {
    this.driver.close()
  }

  /**
   * Read a file/webpage config to process & execute the corresponding issues
   *
   * @param {string} filename the name of the file with the instructions
   */
  async runPage(filename) {
    let instructions = JSON.parse(fs.readFileSync(path.join(__dirname, '../../webpages', filename), 'utf8'))
    await asyncForEach(instructions.instructions, async instruction => {
      await this.runInstruction(instruction)
    })
  }

  /**
   * Run one command/instruction
   *
   * @param {object} instruction the instructions, what to do in the browser
   */
  async runInstruction(instruction) {
    // needed commands:
    // - click
    // - goto
    // - fill input
    let commands = Object.keys(instruction)
    asyncForEach(commands, async command => {
      switch (command) {
      case 'fill':
        await this.fillFields(instruction[command])
        break
      case 'open':
        // backwards-compatibility. use "goto" instead
        await this.driver.goto(instruction[command])
        break
      case 'end':
        await this.destroy()
        break
      default:
        // applies to click, goto, ... and some security dangerousities
        await executeFunctionByName(command, this.driver, instruction[command])
      }
    })
    await sandman.randomSleep(2500)
  }

  /**
   * Fill in some (form) fields
   *
   * @param {array} fields the fields to fill in. Array of objects.
   * Every object has selector as key, value is the text to fill in
   */
  async fillFields(fields) {
    // loop fields array
    await asyncForEach(fields, async field => {
      // find selectors for this field collection
      let fieldSelectors = Object.keys(field)
      // loop selectors
      await asyncForEach(fieldSelectors, async selector => {
        // select each field & type what is recommended
        await this.driver.type(selector, field[fieldSelectors])
      })
    })
  }
}

BrowseCommand.description = `Start browsing the configured page(s)
...
`

// allow multiple args
BrowseCommand.strict = false

// setup args
BrowseCommand.args = [{
  name: 'webpage',
  required: false,
  description: 'The page to browse',
  hidden: false,
  options: availablePages,
}]

BrowseCommand.flags = {
  debug: flags.string({char: 'd', description: 'debug: get additional logs, show browser', default: false, options: [true, false]}),
}

module.exports = BrowseCommand
