const fs = require('fs')
// const path = require('path')

const exceptions = ['index.js', 'abstract-instruction.js']
// the instructions to be populated
let instructions = {}

var normalizedPath = __dirname

/**
 * Require all files in this directory in order to bundle them up
 */
fs.readdirSync(normalizedPath).forEach(file => {
  if (!exceptions.includes(file)) {
    let Instruction = require('./' + file)
    instructions[Instruction.identifier] = Instruction
  }
})

module.exports = instructions
