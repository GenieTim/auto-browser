const fs = require('fs')
// const path = require('path')

const exceptions = new Set(['index.js', 'abstract-instruction.js'])
// the instructions to be populated
let instructions = {}

var normalizedPath = __dirname

/**
 * Require all files in this directory in order to bundle them up
 */
for (const file of fs.readdirSync(normalizedPath)) {
  if (!exceptions.has(file)) {
    let Instruction = require('./' + file)
    instructions[Instruction.identifier] = Instruction
  }
}

module.exports = instructions
