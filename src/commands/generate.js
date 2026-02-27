import {Command, Flags} from '@oclif/core'
import {select, input, confirm} from '@inquirer/prompts'
import fs from 'fs'
import path from 'path'
import extractHostname from '../utils/extract-hostname.js'
import instructions from '../instructions/index.js'
import crypto from 'crypto'
import {URL} from 'url'
const __filename = new URL('', import.meta.url).pathname
const __dirname = new URL('.', import.meta.url).pathname

class GenerateCommand extends Command {
  async run() {
    // get args & flags as necessary
    const {flags} = await this.parse(GenerateCommand)

    // setup local vars
    // this.instructionChoices = {}

    // for (let instructionKey in instructions) {
    //   if (Object.prototype.hasOwnProperty.call(instructions, instructionKey)) {
    //     let instruction = instructions[instructionKey]
    //     this.instructionChoices[instruction.identifier] = instruction.description
    //   }
    // }

    this.instructionChoicesArray = [];
    for (let instructionKey in instructions) {
      this.instructionChoicesArray.push({
        "value": instructionKey,
        "name": instructions[instructionKey].description
      })
    }
    // this.log(instructions);
    // this.log(this.instructionChoicesArray);

    // start asking
    let site = {}
    site.name = await input({message: 'What is the name of the task?'})
    let url = await input({message: 'What is the base URL of the task?'})
    site.instructions = []
    site.instructions.push({
      goto: url,
    })
    let addNew = true
    while (addNew) {
      site.instructions.push(await this.getInstruction())
      addNew = await confirm({message: 'Add another instruction?'})
    }

    // Do we want to end the session after each
    // site.instructions.push({
    //   end: 'end',
    // })

    let target = path.join(__dirname, '../../webpages', extractHostname(url) + '.json')
    // just to be sure not to end in an endless loop in worst case
    // I hope there will never even a second attempt be necessary
    let attempts = 0
    while (fs.existsSync(target) && attempts < 10) {
      target = path.join(
        __dirname,
        '../../webpages',
        extractHostname(url) + '-' + crypto.randomBytes(10).toString('hex') + '.json',
      )
      attempts += 1
    }

    fs.writeFileSync(target, JSON.stringify(site), 'utf8')
    if (flags.debug) {
      this.log(`Wrote file ${target}`)
    }
  }

  /**
   * Request an instruction from the user
   *
   * @return {object} the instruction object
   */
  async getInstruction() {
    let instructionChoice = await select({
      message: 'What would you like the task to do?',
      choices: this.instructionChoicesArray,
    })
    let instruction = {}
    if (Object.prototype.hasOwnProperty.call(instructions, instructionChoice)) {
      let instructor = new instructions[instructionChoice]()
      instruction = {}
      instruction[instructionChoice] = await instructor.createInteractively()
    } else {
      this.warn('Not yet handled instructionChoice: ' + instructionChoice)
    }

    return instruction
  }
}

GenerateCommand.description = `Generate a new config for a webpage to browse - interactively
...
`

GenerateCommand.flags = {
  version: Flags.version(),
  help: Flags.help(),
  debug: Flags.string({char: 'd', description: 'debug: write some more stuff'}),
}

// module.exports = GenerateCommand
export default GenerateCommand
