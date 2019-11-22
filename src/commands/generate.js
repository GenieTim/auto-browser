const {Command, flags} = require('@oclif/command')
const inquirer = require('inquirer')
const fs = require('fs')
const path = require('path')
const {cli} = require('cli-ux')
const extractHostname = require('../utils/extract-hostname')

class GenerateCommand extends Command {
  async run() {
    // get args & flags as necessary
    const {flags} = this.parse(GenerateCommand)

    // setup local vars
    this.instructionChoices = {
      goto: 'Open an URL',
      fill: 'Fill in a form field',
      click: 'Click on something',
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

    site.instructions.push({
      end: 'end',
    })

    let target = path.join(__dirname, '../commands', extractHostname(url) + '.json')
    fs.writeFileSync(target, JSON.stringify(site), 'utf8')
    if (flags.debug) {
      this.log(`Wrote file ${target}`)
    }
  }

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
    switch (instructionChoice) {
    case 'goto':
      instruction[instructionChoice] = await cli.prompt('Where would you like to go?')
      break
    case 'click':
      instruction[instructionChoice] = await cli.prompt('What is the selector of what to click?')
      break
    case 'fill':
      instruction[instructionChoice] = await this.askForFormFields()
      break
    default:
      this.warn('Not yet handled instructionChoice: ' + instructionChoice)
    }
    return instruction
  }

  async askForFormFields() {
    let fields = []
    let addNew = true
    while (addNew) {
      let field = {}
      let selector = await cli.prompt('What is the field\'s selector?')
      let text = await cli.prompt('What should be filled in?')
      field[selector] = text
      fields.push(field)
      addNew = await cli.confirm('Add another field?')
    }
  }
}

GenerateCommand.description = `Generate a new config for a webpage to browse - interactively
...
`

GenerateCommand.flags = {
  debug: flags.string({char: 'd', description: 'debug: write some more stuff'}),
}

module.exports = GenerateCommand
