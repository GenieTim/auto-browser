import {Command} from '@oclif/core'
import fs from 'fs'
import path from 'path'
import { ux } from '@oclif/core'
const cli = ux;

import {URL} from 'url'
const __filename = new URL('', import.meta.url).pathname
const __dirname = new URL('.', import.meta.url).pathname

class ListCommand extends Command {
  async run() {
    const {flags} =await  this.parse(ListCommand)
    let localAvailablePages = []
    for (const file of fs.readdirSync(path.join(__dirname, '../../webpages'))) {
      let filePath = path.join(__dirname, '../../webpages', file)
      let fileContent = fs.readFileSync(filePath, 'utf8')
      if (fileContent.length > 0) {
        try {
          let webpage = JSON.parse(fileContent)
          let url = ''
          try {
            url = webpage.instructions[0].goto
          } catch (error) {
            this.warn(`File ${filePath} does not have a goto as first statement. Error: ` + error)
          }

          localAvailablePages.push({
            file: file,
            name: webpage.name,
            page: url,
            instructionCount: webpage.instructions.length,
          })
        } catch (error) {
          this.warn("Failed listing file: '" + filePath + "', error: " + error)
        }
      }
    }

    cli.table(localAvailablePages, {
      name: {
        minWidth: 7,
      },
      page: {},
      file: {},
      instructionCount: {
        header: 'Instruction Count',
        extended: true,
      },
    }, {
      printLine: this.log,
      ...flags, // parsed flags
    })
  }
}

ListCommand.description = `List all available pages with their name/description
...
`

ListCommand.flags = {
  ...cli.table.flags(),
}

// module.exports = ListCommand
export default ListCommand
