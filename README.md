auto-browser
============

Light abstraction onto puppeteer in order to simplify easy browser automation tasks.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/auto-browser.svg)](https://npmjs.org/package/auto-browser)
[![Downloads/week](https://img.shields.io/npm/dw/auto-browser.svg)](https://npmjs.org/package/auto-browser)
[![License](https://img.shields.io/npm/l/auto-browser.svg)](https://github.com/GenieTim/auto-browser/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
Example usage includes automatic participation in christmas/advent competitions 
so you do not have to do it manually, 24 times.

<!-- usage -->
```sh-session
$ npm install -g auto-browser
$ auto-browser COMMAND
running command...
$ auto-browser (-v|--version|version)
auto-browser/1.0.3 darwin-x64 node-v17.2.0
$ auto-browser --help [COMMAND]
USAGE
  $ auto-browser COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
- [auto-browser](#auto-browser)
- [Usage](#usage)
- [Commands](#commands)
  - [`auto-browser browse [WEBPAGE]`](#auto-browser-browse-webpage)
  - [`auto-browser generate`](#auto-browser-generate)
  - [`auto-browser help [COMMAND]`](#auto-browser-help-command)
  - [`auto-browser list`](#auto-browser-list)

## `auto-browser browse [WEBPAGE]`

Start browsing the configured page(s)

```
USAGE
  $ auto-browser browse [WEBPAGE]

ARGUMENTS
  WEBPAGE  (your json files) The page to browse. No argument = one after another.

OPTIONS
  -c, --confirmNext  confirm next: require user (CI) interaction before moving to next page
  -d, --debug        debug: get additional logs, show browser (disable headless)

DESCRIPTION
  ...
```

_See code: [src/commands/browse.js](https://github.com/GenieTim/auto-browser/blob/v1.0.3/src/commands/browse.js)_

## `auto-browser generate`

Generate a new config for a webpage to browse - interactively

```
USAGE
  $ auto-browser generate

OPTIONS
  -d, --debug=debug  debug: write some more stuff

DESCRIPTION
  ...
```

_See code: [src/commands/generate.js](https://github.com/GenieTim/auto-browser/blob/v1.0.3/src/commands/generate.js)_

## `auto-browser help [COMMAND]`

Display help for auto-browser.

```
USAGE
  $ auto-browser help [COMMAND]

ARGUMENTS
  COMMAND  Command to show help for.

OPTIONS
  -n, --nested-commands  Include all nested commands in the output.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.10/src/commands/help.ts)_

## `auto-browser list`

List all available pages with their name/description

```
USAGE
  $ auto-browser list

OPTIONS
  -x, --extended          show extra columns
  --columns=columns       only show provided columns (comma-separated)
  --csv                   output is csv format [alias: --output=csv]
  --filter=filter         filter property by partial string matching, ex: name=foo
  --no-header             hide table header from output
  --no-truncate           do not truncate output to fit screen
  --output=csv|json|yaml  output in a more machine friendly format
  --sort=sort             property to sort by (prepend '-' for descending)

DESCRIPTION
  ...
```

_See code: [src/commands/list.js](https://github.com/GenieTim/auto-browser/blob/v1.0.3/src/commands/list.js)_
<!-- commandsstop -->
