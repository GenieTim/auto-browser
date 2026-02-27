import {Command, ux, Flags} from '@oclif/core'
import fs from 'fs'
import path from 'path'
import { json } from 'stream/consumers'
import {URL} from 'url'
const __filename = new URL('', import.meta.url).pathname
const __dirname = new URL('.', import.meta.url).pathname

class ListCommand extends Command {
  async run() {
    const {flags} =await  this.parse(ListCommand)
    let localAvailablePages = []
    for (const file of fs.readdirSync(path.join(__dirname, '../../webpages'))) {
      let filePath = path.join(__dirname, '../../webpages', file)
      // Skip directories
      if (fs.statSync(filePath).isDirectory()) {
        continue
      }
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

    // Display the results
    if (flags.csv) {
      // CSV output
      this.log('name,page,file,instructionCount')
      for (const page of localAvailablePages) {
        this.log(`${page.name},${page.page},${page.file},${page.instructionCount}`)
      }
    } else if (flags.json) {
      // JSON output
      this.log(JSON.stringify(localAvailablePages, null, 2))
    } else {
      // Simple table output
      this.log('Name'.padEnd(30) + 'Page'.padEnd(50) + 'File'.padEnd(40) + 'Instructions')
      this.log('-'.repeat(130))
      for (const page of localAvailablePages) {
        const name = (page.name || '').substring(0, 29).padEnd(30)
        const url = (page.page || '').substring(0, 49).padEnd(50)
        const file = (page.file || '').substring(0, 39).padEnd(40)
        const count = String(page.instructionCount)
        this.log(name + url + file + count)
      }
    }
  }
}

ListCommand.description = `List all available pages with their name/description
...
`

ListCommand.flags = {
  csv: Flags.boolean({description: 'output in CSV format'}),
  json: Flags.boolean({description: 'output in JSON format'}),
}

// module.exports = ListCommand
export default ListCommand
