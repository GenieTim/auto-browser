import fs from 'fs'

const exceptions = new Set(['index.js', 'abstract-instruction.js'])
// the instructions to be populated
let instructions = {}

import {URL} from 'url'
const __filename = new URL('', import.meta.url).pathname
const __dirname = new URL('.', import.meta.url).pathname
var normalizedPath = __dirname

/**
 * Require all files in this directory in order to bundle them up
 */
for (const file of fs.readdirSync(normalizedPath)) {
  if (!exceptions.has(file)) {
    // console.log("Loading instruction: " + file)
    let Instruction = await import('./' + file)
    instructions[Instruction.default.identifier] = Instruction.default
  }
}

// module.exports = instructions
export default instructions
