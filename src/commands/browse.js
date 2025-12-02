import {Command, Flags} from '@oclif/core'
import fs from 'fs'
import path from 'path'
import {glob} from 'glob'
import asyncForEach from '../utils/async-foreach.js'
import puppeteer from 'puppeteer'
import sandman from '../utils/sandman.js'
import executeFunctionByName from '../utils/execute-function-by-name.js'
import instructions from '../instructions/index.js'
import { ux } from '@oclif/core'

const cli = ux;

import {URL} from 'url'
const __filename = new URL('', import.meta.url).pathname
const __dirname = new URL('.', import.meta.url).pathname
// find all available pages
const sourceDir = path.join(__dirname, '../../webpages')
let availableFiles = glob.sync(path.join(sourceDir, '*.json'), {
  nodir: true,
})
let availablePages = []
for (const file of availableFiles) {
  availablePages.push(path.basename(file))
}

class BrowseCommand extends Command {
  async run() {
    const {argv, flags} = await this.parse(BrowseCommand)
    this.debug = flags.debug
    this.dryRun = flags.dryRun

    let files = argv
    if (files.length === 0) {
      files = availablePages
    }

    if (this.dryRun) {
      this.log('🔍 DRY RUN MODE - Validating configurations without executing...')
      return this.validateConfigurations(files)
    }

    this.instructionContext = {}
    await this.initializeBrowser()
    await sandman.sleep(5000)
    this.errorCount = 0
    await asyncForEach(files, async page => {
      try {
        await this.runPage(page)
      } catch (error) {
        this.errorCount++
        // catch errors top-level to cancel pages on error
        this.warn('Failed to process page: ' + page + '. Error: ' + error)
      }

      await sandman.randomSleep(1000)
      // additional debug measure: let user decide to go on
      if (flags.confirmNext) {
        let goOn = false
        while (!goOn) {
          goOn = await cli.confirm('Ready to go to next page?')
        }
      }
    })

    await this.driver.close()
    await this.browser.close()
    if (this.errorCount <= 0) {
      this.log('✅ All pages processed successfully!')
      this.exit()
    } else {
      this.warn(`⚠️  Completed with ${this.errorCount} error(s)`)
      this.exit(2)
    }
  }

  /**
   * Validate configuration files without executing
   *
   * @param {string[]} files the configuration files to validate
   */
  async validateConfigurations(files) {
    let validCount = 0
    let invalidCount = 0
    
    await asyncForEach(files, async filename => {
      try {
        const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../webpages', filename), 'utf8'))
        
        if (!config.name) {
          throw new Error('Missing "name" field')
        }
        
        if (!Array.isArray(config.instructions) || config.instructions.length === 0) {
          throw new Error('Missing or empty "instructions" array')
        }
        
        // Validate each instruction
        config.instructions.forEach((instruction, index) => {
          const commands = Object.keys(instruction)
          if (commands.length === 0) {
            throw new Error(`Instruction ${index} has no commands`)
          }
          
          commands.forEach(command => {
            if (!instructions[command] && command !== 'end') {
              this.warn(`  Unknown instruction type: "${command}" at index ${index}`)
            }
          })
        })
        
        this.log(`✅ ${filename}: ${config.name} (${config.instructions.length} instructions)`)
        validCount++
      } catch (error) {
        this.error(`❌ ${filename}: ${error.message}`)
        invalidCount++
      }
    })
    
    this.log(`\n📊 Validation Summary: ${validCount} valid, ${invalidCount} invalid`)
    if (invalidCount > 0) {
      this.exit(1)
    }
  }

  /**
   * Set up the browser
   */
  async initializeBrowser() {
    this.browser = await puppeteer.launch({
      headless: !this.debug,
      userDataDir: './user_data',
    })
    await this.openNewPage()
  }

  /**
   * Open a new page/tab
   */
  async openNewPage() {
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
    this.driver = await this.browser.newPage()
  }

  /**
   * Read a file/webpage config to process & execute the corresponding issues
   *
   * @param {string} filename the name of the file with the instructions
   */
  async runPage(filename) {
    let instructions = JSON.parse(fs.readFileSync(path.join(__dirname, '../../webpages', filename), 'utf8'))
    this.log('Running page "' + instructions.name + '"...')
    await asyncForEach(instructions.instructions, async instruction => {
      // no try-catch here to have a page fail if something does not work
      await this.runInstruction(instruction)
    })
  }

  /**
   * Run one command/instruction
   *
   * @param {object} instruction the instructions, what to do in the browser
   */
  async runInstruction(instruction) {
    if (this.debug) {
      this.log('Running instruction ' + JSON.stringify(instruction))
    }

    let pageCount = (await this.browser.pages()).length
    let commands = Object.keys(instruction)
    await asyncForEach(commands, async command => {
      if (Object.prototype.hasOwnProperty.call(instructions, command)) {
        let instructor = new instructions[command](this)
        // throws:
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
    // switch to new page if a new one was opened.
    // assuming no tab juggling happens (as no corresponding instruction yet)
    let newPages = await this.browser.pages
    if (pageCount < (newPages).length) {
      this.driver = newPages[newPages.length - 1]
    }
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
  version: Flags.version(),
  help: Flags.help(),
  debug: Flags.boolean({char: 'd', description: 'debug: get additional logs, show browser (disable headless)', default: false}),
  confirmNext: Flags.boolean({char: 'c', description: 'confirm next: require user (CI) interaction before moving to next page', default: false}),
  dryRun: Flags.boolean({description: 'dry-run: validate configurations without executing browser actions', default: false}),
}

// module.exports = BrowseCommand
export default BrowseCommand
