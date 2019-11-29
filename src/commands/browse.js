const {Command, flags} = require('@oclif/command')
const fs = require('fs')
const path = require('path')
const glob = require('glob')
const asyncForEach = require('../utils/async-foreach')
const puppeteer = require('puppeteer')
const sandman = require('../utils/sandman')
const executeFunctionByName = require('../utils/execute-function-by-name')
const instructions = require('../instructions')

// find all available pages
const sourceDir = path.join(__dirname, '../../webpages')
let availableFiles = glob.sync(path.join(sourceDir, '*.json'), {
  nodir: true,
})
let availablePages = []
availableFiles.forEach(file => {
  availablePages.push(path.basename(file))
})

class BrowseCommand extends Command {
  async run() {
    const {argv, flags} = this.parse(BrowseCommand)
    this.debug = flags.debug

    let files = argv
    if (files.length === 0) {
      files = availablePages
    }
    this.instructionContext = {}
    await this.initializeBrowser()
    await sandman.sleep(5000)
    await asyncForEach(files, async page => {
      try {
        await this.runPage(page)
      } catch (error) {
        // catch errors top-level to cancel pages on error
        this.warn('Failed to process page: ' + page + '. Error: ' + error)
        // await this.destroy()
        // await this.initializeBrowser()
        // this.instructionContext = {}
      }
      await sandman.randomSleep(1000)
    })
    this.exit()
  }

  /**
   * Set up the browser
   */
  async initializeBrowser() {
    this.browser = await puppeteer.launch({
      headless: !this.debug,
      userDataDir: './user_data',
    })
    try {
      this.driver = await this.browser.newPage()
    } catch (error) {
      this.logger.error(error)
      return
    }
    if (this.debug) {
      this.driver.setViewport({width: 0, height: 0})
    }
  }

  /**
   * Reset the browser instance
   */
  async destroy() {
    await this.driver.close()
  }

  /**
   * Restart the browser instance/session.
   * Don't know yet – restarting page is most stable.
   */
  async restart() {
    await this.driver.close()
    await this.browser.newPage()
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
    let commands = Object.keys(instruction)
    asyncForEach(commands, async command => {
      if (Object.prototype.hasOwnProperty.call(instructions, command)) {
        let instructor = new instructions[command]()
        await instructor.follow(instruction[command], this.driver, this.instructionContext)
      } else if (command === 'end') {
        await this.restart()
      } else {
        // instruction not found – delegate it to the driver :?
        // applies to click, goto, ... and some security dangerousities
        await executeFunctionByName(command, this.driver, instruction[command])
      }
    })
    await sandman.randomSleep(2500)
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
  debug: flags.boolean({char: 'd', description: 'debug: get additional logs, show browser', default: false}),
}

module.exports = BrowseCommand
