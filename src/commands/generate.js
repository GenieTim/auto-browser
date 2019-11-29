const {Command, flags} = require('@oclif/command')
const inquirer = require('inquirer')
const fs = require('fs')
const path = require('path')
const {cli} = require('cli-ux')
const extractHostname = require('../utils/extract-hostname')
const instructions = require('../instructions')
const crypto = require('crypto')

class GenerateCommand extends Command {
  async run() {
    // get args & flags as necessary
    const {flags} = this.parse(GenerateCommand)

    // setup local vars
    this.instructionChoices = {}

    for (let instructionKey in instructions) {
      if (Object.prototype.hasOwnProperty.call(instructions, instructionKey)) {
        let instruction = instructions[instructionKey]
        this.instructionChoices[instruction.identifier] = instruction.description
      }
    }

    // start asking
    let site = {}
    site.name = await cli.prompt('What is the name of the task?')
    let url = await cli.prompt('What is the base URL of the task?')
    site.instructions = []
    site.instructions.push({
      goto: url,
    })
    let addNew = true
    while (addNew) {
      site.instructions.push(await this.getInstruction())
      addNew = await cli.confirm('Add another instruction?')
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
      target = path.join(__dirname, '../../webpages', extractHostname(url) + '-' + crypto.randomBytes(10).toString('hex') + '.json')
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
    let answers = await inquirer.prompt([{
      type: 'list',
      name: 'instruction',
      message: 'What would you like the task to do?',
      choices: Object.values(this.instructionChoices),
      filter: val => {
        // get key by value
        return Object.keys(this.instructionChoices).find(key => this.instructionChoices[key] === val)
      },
    }])
    let instructionChoice = answers.instruction
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
  debug: flags.string({char: 'd', description: 'debug: write some more stuff'}),
}

module.exports = GenerateCommand
