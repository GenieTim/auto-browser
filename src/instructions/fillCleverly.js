
import fs from 'fs'
import path from 'path'
import {input, confirm} from '@inquirer/prompts'
import sandman from '../utils/sandman.js'
import asyncForEach from '../utils/async-foreach.js'
import {URL} from 'url'
const __filename = new URL('', import.meta.url).pathname
const __dirname = new URL('.', import.meta.url).pathname

/**
 * Fill form fields based on
 */
class FillCleverlyInstruction {
  /**
   * Instantiate this class
   *
   * @param {Object} logger an instance of a class with methods: log, warn, error
   */
  constructor(logger) {
    this.logger = logger
    this.globalFields = []
    this.globalFieldsFile = path.join(__dirname, '../../global-fields.json')
    if (fs.existsSync(this.globalFieldsFile)) {
      this.globalFields = JSON.parse(
        fs.readFileSync(this.globalFieldsFile, 'utf8'),
      )
    }
  }

  /**
   * Run/Execute/Follow this instruction
   *
   * @param {object} instruction the instructions, as created by createInteractively()
   * @param {module.puppeteer.Browser} driver the browser to execute upon
   * @param {object} _ an object to populate/read from to exchange data between instructions
   */
  async follow(instruction, driver, _) {
    // throws:
    await this.fillFields(instruction, driver)
  }

  /**
   * Create this instruction by requesting data from the user via CI
   */
  async createInteractively() {
    let addNew = await confirm({message: 'Add another field to the global config?'})
    while (addNew) {
      let selector = await input({message: "What is the field's selector?"})
      let text = await input({message: 'What should be filled in?'})
      let field = {
        selectors: [selector],
        text: text,
      }
      this.globalFields.push(field)
      addNew = await confirm({message: 'Add another field to the global config?'})
      fs.writeFileSync(this.globalFieldsFile, JSON.stringify(this.globalFields))
    }

    return []
  }

  /**
   * Fill in some (form) fields
   *
   * @param {array} fields an empty array for now giving the config
   * @param {module.puppeteer.Browser} driver the browser to execute upon
   */
  async fillFields(fields, driver) {
    // Track filled fields by their unique identifier (id or name) to avoid duplicates
    const filledFieldIdentifiers = new Set()

    this.logger.log('🔍 Starting Phase 1: Traditional selector matching')

    // Phase 1: Traditional approach - match selectors to fields
    await asyncForEach(this.globalFields, async field => {
      // find selectors for this field collection
      let fieldSelectors = this.blowSelectorsUp(field.selectors)
      this.logger.log(`  📋 Checking field config with value: "${field.text}" (${fieldSelectors.length} selectors)`)

      // loop selectors
      await asyncForEach(fieldSelectors, async selector => {
        selector = this.replaceVariables(selector)
        if (await driver.$eval(selector, () => true).catch(() => false)) {
          // Get unique identifier for this field (prefer id/name from element, avoid using selector)
          const fieldInfo = await driver.evaluate(sel => {
            const el = document.querySelector(sel)
            if (!el) return { identifier: null, currentValue: '', isFormField: false, tagName: '', debugInfo: '' }

            // Check if this is actually a form input element
            const tagName = el.tagName.toLowerCase()
            const isFormField = tagName === 'input' || tagName === 'textarea' || tagName === 'select'

            // Create a truly unique identifier for this specific DOM element
            // Use a combination of attributes to ensure uniqueness
            let identifier
            if (el.id) {
              identifier = `#${el.id}`
            } else if (el.name) {
              // Include tag name to differentiate elements with same name attribute
              identifier = `${tagName}[name="${el.name}"]`
            } else {
              // Fallback: use selector + xpath-like position
              const siblings = Array.from(el.parentElement?.children || []).filter(
                child => child.tagName === el.tagName
              )
              const index = siblings.indexOf(el)
              identifier = `${tagName}_${sel}_${index}`
            }

            // Debug info to identify the exact element
            const debugInfo = `id="${el.id || 'none'}" name="${el.name || 'none'}" class="${el.className || 'none'}"`

            return {
              identifier,
              currentValue: el.value || '',
              isFormField,
              tagName,
              debugInfo
            }
          }, selector)

          // Skip if this is not a form field (e.g., a div, span, etc.)
          if (!fieldInfo.isFormField) {
            this.logger.log(`    ⏭️  Skipping ${selector} - not a form input (found ${fieldInfo.tagName})`)
            return
          }

          this.logger.log(`    🔍 Found field via ${selector}: ${fieldInfo.debugInfo}`)

          // Skip if this is not a form field (e.g., a div, span, etc.)
          if (!fieldInfo.isFormField) {
            this.logger.log(`    ⏭️  Skipping ${selector} - not a form input (found ${fieldInfo.tagName})`)
            return
          }

          const fieldIdentifier = fieldInfo.identifier

          // Check if already filled
          if (filledFieldIdentifiers.has(fieldIdentifier)) {
            this.logger.log(`    ⏭️  Skipping ${selector} (identifier: ${fieldIdentifier}) - already filled`)
            return
          }

          // Check if field already has a value (use the value we already retrieved)
          const fieldType = await driver.evaluate(sel => {
            const el = document.querySelector(sel)
            return el ? el.type : null
          }, selector)

          const hasValue = fieldInfo.currentValue && fieldInfo.currentValue.trim() !== '' &&
                          fieldType !== 'checkbox' && fieldType !== 'radio'

          if (hasValue) {
            this.logger.log(`    ⏭️  Skipping ${selector} (identifier: ${fieldIdentifier}) - already has value`)
            filledFieldIdentifiers.add(fieldIdentifier)
            return
          }

          try {
            this.logger.log(`    ✅ Phase 1: Filling ${selector} (identifier: ${fieldIdentifier}) with "${field.text}"`)
            await this.fillField(driver, selector, field.text)
            filledFieldIdentifiers.add(fieldIdentifier)
          } catch (error) {
            this.logger.warn(
              '    ❌ Failed to fill fields for selector ' +
                selector +
                '. Error: ' +
                error,
            )
          }
        }
      })
    })

    // Phase 2: Reverse approach - find unfilled fields and match them to config
    this.logger.log(`\n🔍 Starting Phase 2: Discovery-based matching (${filledFieldIdentifiers.size} fields already filled)`)
    await this.discoverAndFillFields(driver, filledFieldIdentifiers)
  }

  /**
   * Fill a single field with the given value
   *
   * @param {module.puppeteer.Browser} driver the browser to execute upon
   * @param {string} selector the CSS selector for the field
   * @param {string} value the value to fill
   */
  async fillField(driver, selector, value) {
    // Check if this is a select element
    const isSelect = await driver.evaluate(sel => {
      const el = document.querySelector(sel)
      return el && el.tagName.toLowerCase() === 'select'
    }, selector)

    if (isSelect) {
      // Try to find option by text content and select by value
      const result = await driver.evaluate((sel, text) => {
        const selectEl = document.querySelector(sel)
        if (!selectEl) return { success: false, options: [] }

        // Collect all options for debugging
        const options = Array.from(selectEl.options).map(opt => ({
          text: opt.text.trim(),
          value: opt.value
        }))

        // First try exact match
        for (const option of selectEl.options) {
          if (option.text.trim() === text) {
            selectEl.value = option.value
            // Trigger change event
            selectEl.dispatchEvent(new Event('change', { bubbles: true }))
            return { success: true, matched: option.text.trim(), method: 'exact', options }
          }
        }

        // Then try case-insensitive partial match
        const lowerText = text.toLowerCase()
        for (const option of selectEl.options) {
          if (option.text.toLowerCase().includes(lowerText)) {
            selectEl.value = option.value
            selectEl.dispatchEvent(new Event('change', { bubbles: true }))
            return { success: true, matched: option.text.trim(), method: 'partial', options }
          }
        }

        return { success: false, options }
      }, selector, value)

      if (result.success) {
        this.logger.log(`      💡 Selected "${result.matched}" via ${result.method} match`)
      } else {
        this.logger.warn(`      ⚠️  Could not select "${value}" in ${selector}. Available options: ${JSON.stringify(result.options)}`)
        // Fallback to Puppeteer's select if text matching failed
        try {
          await driver.select(selector, value)
          this.logger.log(`      💡 Fallback select succeeded`)
        } catch (error) {
          this.logger.warn(`      ❌ Fallback select also failed: ${error.message}`)
        }
      }
    } else {
      // Check if the field is a checkbox or radio button
      const fieldType = await driver.evaluate(selector => {
        // eslint-disable-next-line no-undef
        const element = document.querySelector(selector)
        return element ? element.type : null
      }, selector)

      if (fieldType === 'radio') {
        // Handle radio buttons - match by name and value
        const radioSelected = await driver.evaluate((selector, targetValue) => {
          // eslint-disable-next-line no-undef
          const element = document.querySelector(selector)
          if (!element) return false

          // Get the name attribute to find all radio buttons in the same group
          const radioName = element.name
          if (!radioName) {
            // Fallback: just click this radio if it matches the value
            if (element.value === targetValue) {
              element.click()
              return true
            }
            return false
          }

          // Find the radio button with matching value in the same group
          const radios = document.querySelectorAll(`input[type="radio"][name="${radioName}"]`)
          for (const radio of radios) {
            if (radio.value === targetValue) {
              radio.click()
              return true
            }
          }
          return false
        }, selector, value)

        if (!radioSelected) {
          this.logger.warn(`      ⚠️  Could not find radio button with value "${value}" for selector ${selector}`)
        } else {
          this.logger.log(`      ✓ Selected radio button with value "${value}"`)
        }
      } else if (fieldType === 'checkbox') {
        // Handle checkboxes (including custom checkboxes with hidden inputs)
        const shouldBeChecked = this.isTruthy(value)
        const checkboxResult = await driver.evaluate((selector, shouldBeChecked) => {
          // eslint-disable-next-line no-undef
          const element = document.querySelector(selector)
          if (!element) return { success: false, reason: 'element not found' }

          // Check if the checkbox is hidden (custom checkbox implementation)
          const isHidden = element.classList.contains('hidden') ||
                          element.style.display === 'none' ||
                          element.style.visibility === 'hidden' ||
                          element.offsetParent === null

          if (isHidden && element.checked !== shouldBeChecked) {
            // Try to find the visible custom checkbox element
            // Common patterns: sibling div with role="checkbox", label, or parent wrapper
            let clickTarget = null

            // Pattern 1: Sibling div with role="checkbox"
            const parent = element.parentElement
            if (parent) {
              clickTarget = parent.querySelector('[role="checkbox"]')
              if (!clickTarget) {
                // Pattern 2: Label with for attribute matching the checkbox id
                if (element.id) {
                  clickTarget = document.querySelector(`label[for="${element.id}"]`)
                }
              }
              if (!clickTarget) {
                // Pattern 3: Any clickable sibling or parent that might toggle the checkbox
                clickTarget = parent.querySelector('div[tabindex]') ||
                             parent.querySelector('.checkbox') ||
                             parent.querySelector('[class*="checkbox"]')
              }
            }

            if (clickTarget) {
              clickTarget.click()
              return { success: true, method: 'custom checkbox click' }
            } else {
              // Fallback: try to click the hidden element anyway
              element.click()
              return { success: true, method: 'direct click on hidden element' }
            }
          } else if (element.checked !== shouldBeChecked) {
            // Normal checkbox - just click it
            element.click()
            return { success: true, method: 'direct click' }
          }

          return { success: true, method: 'already in desired state' }
        }, selector, shouldBeChecked)

        if (checkboxResult.success) {
          this.logger.log(`      ✓ Checkbox handled via ${checkboxResult.method}`)
        } else {
          this.logger.warn(`      ⚠️  Failed to handle checkbox: ${checkboxResult.reason}`)
        }
      } else {
        // Handle text inputs, textareas, etc.

        // Get field context for smart value selection
        const fieldContext = await driver.evaluate(sel => {
          const el = document.querySelector(sel)
          if (!el) return ''
          return [el.id, el.name, el.placeholder, el.getAttribute('aria-label')]
            .filter(Boolean)
            .join(' ')
        }, selector)

        // Get the appropriate value based on context
        const valueToFill = this.getValueToFill(selector, value, fieldContext)

        // Get current value before clearing for debugging
        const currentValue = await driver.evaluate(sel => {
          const el = document.querySelector(sel)
          return el ? el.value : ''
        }, selector)

        this.logger.log(`      💡 Field context: "${fieldContext}", current value: "${currentValue}", filling with: "${valueToFill}"`)

        // first, clear form field and ensure it's focused
        try {
          await driver.evaluate(selector => {
            // eslint-disable-next-line no-undef
            const el = document.querySelector(selector)
            if (el) {
              el.value = ''
              el.focus() // Ensure the field has focus before typing
            }
          }, selector)
        } catch (error) {
          this.logger.warn(
            'Failed to empty input with selector ' +
              selector +
              '. Error: ' +
              error,
          )
        }

        // Wait a moment for focus to settle
        await sandman.sleep(100)

        // then, type value - use click first to ensure proper focus
        await driver.click(selector)
        await driver.type(selector, valueToFill)

        // Verify what was actually filled
        const finalValue = await driver.evaluate(sel => {
          const el = document.querySelector(sel)
          return el ? el.value : ''
        }, selector)

        if (finalValue !== valueToFill) {
          this.logger.warn(`      ⚠️  Value mismatch! Expected "${valueToFill}" but got "${finalValue}"`)
        } else {
          this.logger.log(`      ✓ Verified field contains: "${finalValue}"`)
        }
      }
    }

    // Small delay to mimic human behavior
    await sandman.randomSleep(500);
  }

  /**
   * Check if a value should be treated as "true" for checkbox purposes
   *
   * @param {string} value the value to check
   * @returns {boolean} true if the value represents a truthy state
   */
  isTruthy(value) {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim()
      return normalized === 'true' ||
             normalized === 'yes' ||
             normalized === '1' ||
             normalized === 'on' ||
             normalized === 'checked'
    }
    return Boolean(value)
  }

  /**
   * Discover all visible, unfilled form fields and try to fill them
   * based on partial matches with text-based selectors
   *
   * @param {module.puppeteer.Browser} driver the browser to execute upon
   * @param {Set} filledFieldIdentifiers Set of field identifiers (id/name) that have already been filled
   */
  async discoverAndFillFields(driver, filledFieldIdentifiers = new Set()) {
    this.logger.log('  🔎 Discovering unfilled form fields...')

    // Get all form fields with their metadata
    const formFields = await driver.evaluate(() => {
      const fields = []
      // Only query actual form input elements, not divs or other non-input elements
      const inputs = document.querySelectorAll('input, textarea, select')

      inputs.forEach((input, index) => {
        // Skip if already filled (and not empty)
        if (input.value && input.value.trim() !== '') {
          return
        }

        // Skip if not visible (honeypot detection)
        const style = window.getComputedStyle(input)
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0' ||
          input.offsetParent === null
        ) {
          return
        }

        // Skip submit, button, hidden, and other non-data input types
        const type = input.type ? input.type.toLowerCase() : ''
        if (
          type === 'submit' ||
          type === 'button' ||
          type === 'hidden' ||
          type === 'image' ||
          type === 'reset'
        ) {
          return
        }

        // Gather all relevant text that might match selectors
        const matchableText = []

        // Add input attributes
        if (input.id) matchableText.push(input.id)
        if (input.name) matchableText.push(input.name)
        if (input.className) matchableText.push(input.className)
        if (input.placeholder) matchableText.push(input.placeholder)
        if (input.getAttribute('aria-label')) matchableText.push(input.getAttribute('aria-label'))
        if (input.getAttribute('data-label')) matchableText.push(input.getAttribute('data-label'))
        if (input.title) matchableText.push(input.title)

        // Find associated label
        let labelText = ''
        if (input.id) {
          const label = document.querySelector(`label[for="${input.id}"]`)
          if (label) labelText = label.textContent
        }
        if (!labelText) {
          // Check if input is inside a label
          const parentLabel = input.closest('label')
          if (parentLabel) labelText = parentLabel.textContent
        }
        if (labelText) matchableText.push(labelText)

        // Create a unique selector for this field
        let selector = ''
        let fieldIdentifier = ''
        if (input.id) {
          selector = `#${input.id}`
          fieldIdentifier = input.id
        } else if (input.name) {
          selector = `[name="${input.name}"]`
          fieldIdentifier = input.name
        } else {
          // Fallback to a more complex selector
          selector = `${input.tagName.toLowerCase()}[type="${type}"]`
          if (input.className) {
            selector += `.${input.className.split(' ')[0]}`
          }
          selector += `:nth-of-type(${index + 1})`
          fieldIdentifier = selector
        }

        fields.push({
          selector,
          fieldIdentifier,
          matchableText: matchableText.join(' ').toLowerCase(),
          type: input.tagName.toLowerCase(),
          inputType: type
        })
      })

      return fields
    })

    this.logger.log(`  📊 Discovered ${formFields.length} unfilled form fields`)

    // Try to match and fill each discovered field
    await asyncForEach(formFields, async fieldInfo => {
      // Skip if already filled in Phase 1
      if (filledFieldIdentifiers.has(fieldInfo.fieldIdentifier)) {
        return
      }

      // Check if field already has a value
      const hasValue = await driver.evaluate(sel => {
        const el = document.querySelector(sel)
        if (!el) return false
        return el.value && el.value.trim() !== ''
      }, fieldInfo.selector)

      if (hasValue) {
        filledFieldIdentifiers.add(fieldInfo.fieldIdentifier)
        return
      }

      this.logger.log(`  🎯 Analyzing field: ${fieldInfo.selector} (identifier: ${fieldInfo.fieldIdentifier})`)
      this.logger.log(`     Matchable text: "${fieldInfo.matchableText}"`)

      // Find ALL matching global field configs and their matches
      const matches = []

      for (const field of this.globalFields) {
        // Only use text-based selectors (no CSS syntax)
        const textSelectors = field.selectors.filter(
          sel => this.isTextBasedSelector(sel)
        )

        for (const textSelector of textSelectors) {
          const normalizedSelector = this.replaceVariables(textSelector).toLowerCase()

          // Split matchable text into individual words and also keep compound identifiers
          const matchableWords = fieldInfo.matchableText.split(/[\s_-]+/)

          // Check for exact word match (highest priority)
          const hasExactMatch = matchableWords.some(word => word === normalizedSelector)

          // Check for partial match with word boundary consideration
          // For very short selectors (<=4 chars), require exact match to avoid false positives
          let hasPartialMatch = false
          if (normalizedSelector.length > 4) {
            hasPartialMatch = fieldInfo.matchableText.includes(normalizedSelector)
          } else {
            // For short selectors, only match if it's a complete word or at word boundaries
            hasPartialMatch = matchableWords.some(word =>
              word === normalizedSelector ||
              word.startsWith(normalizedSelector + '_') ||
              word.startsWith(normalizedSelector + '-')
            )
          }

          if (hasExactMatch || hasPartialMatch) {
            const priority = hasExactMatch ? 1000000 + normalizedSelector.length : normalizedSelector.length
            this.logger.log(`     🔸 Match found: "${textSelector}" (priority: ${priority}, exact: ${hasExactMatch}) -> "${field.text}"`)
            matches.push({
              field,
              textSelector,
              // Prioritize: exact match > longer selector > partial match
              priority
            })
          }
        }
      }

      // If we have matches, use the best one
      if (matches.length > 0) {
        // Sort by priority (descending) to prefer exact matches and longer selectors
        matches.sort((a, b) => b.priority - a.priority)

        const bestMatch = matches[0]
        this.logger.log(`     ✅ Phase 2: Best match: "${bestMatch.textSelector}" (priority: ${bestMatch.priority})`)
        try {
          await this.fillField(driver, fieldInfo.selector, bestMatch.field.text)
          filledFieldIdentifiers.add(fieldInfo.fieldIdentifier)
        } catch (error) {
          this.logger.warn(
            `     ❌ Failed to fill discovered field ${fieldInfo.selector}. Error: ${error}`
          )
        }
      } else {
        this.logger.log(`     ⚠️  No matches found for this field`)
      }
    })
  }

  /**
   * Check if a selector is text-based (doesn't contain CSS syntax)
   *
   * @param {string} selector the selector to check
   * @returns {boolean} true if text-based, false otherwise
   */
  isTextBasedSelector(selector) {
    return (
      !selector.includes('.') &&
      !selector.includes('#') &&
      !selector.includes('[') &&
      !selector.includes(']') &&
      !selector.includes('>') &&
      !selector.includes('*')
    )
  }

  /**
   * Parse a birthdate string and extract components
   *
   * @param {string} dateStr the date string (e.g., "02.08.1996" or "08/02/1996")
   * @returns {object} object with day, month, year properties
   */
  parseBirthdate(dateStr) {
    if (!dateStr) return null

    // Try different formats
    const formats = [
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // DD.MM.YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY or MM/DD/YYYY
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    ]

    for (const regex of formats) {
      const match = dateStr.match(regex)
      if (match) {
        // For DD.MM.YYYY and DD/MM/YYYY format
        if (regex.source.startsWith('^(\\d{1,2})')) {
          return {
            day: match[1],
            month: match[2],
            year: match[3]
          }
        } else {
          // For YYYY-MM-DD format
          return {
            day: match[3],
            month: match[2],
            year: match[1]
          }
        }
      }
    }

    return null
  }

  /**
   * Get the value to fill based on the field context
   * This handles special cases like birthdate components
   *
   * @param {string} selector the selector being filled
   * @param {string} value the configured value
   * @param {string} fieldContext any additional context about the field (id, name, etc.)
   * @returns {string} the value to actually fill
   */
  getValueToFill(selector, value, fieldContext = '') {
    const lowerSelector = selector.toLowerCase()
    const lowerContext = fieldContext.toLowerCase()

    // Check if this might be a birthdate component field
    const birthdateFields = this.globalFields.find(f =>
      f.selectors.some(s => s.toLowerCase().includes('birthdate') ||
                           s.toLowerCase().includes('birthday') ||
                           s.toLowerCase().includes('geburtsdatum'))
    )

    if (birthdateFields) {
      const birthdate = this.parseBirthdate(birthdateFields.text)
      if (birthdate) {
        // Check if this is a day field
        if (lowerSelector.includes('day') || lowerContext.includes('day') ||
            lowerSelector.includes('tag') || lowerContext.includes('tag')) {
          // Return day without padding if the original value was unpadded
          return birthdate.day.replace(/^0+/, '') || birthdate.day
        }
        // Check if this is a month field
        if (lowerSelector.includes('month') || lowerContext.includes('month') ||
            lowerSelector.includes('monat') || lowerContext.includes('monat')) {
          // Return month without padding if the original value was unpadded
          return birthdate.month.replace(/^0+/, '') || birthdate.month
        }
        // Check if this is a year field
        if (lowerSelector.includes('year') || lowerContext.includes('year') ||
            lowerSelector.includes('jahr') || lowerContext.includes('jahr')) {
          return birthdate.year
        }
      }
    }

    return value
  }

  /**
   * Hacky temporary adjustment for some ideas
   *
   * @todo outsource to its own instructionset
   * @param {string} selector the selector to adjust
   * @returns {string} the adjusted string/selector
   */
  replaceVariables(selector) {
    try {
      let today = new Date()
      selector = selector.replace('$today', today.getDate().toString())
    } catch (error) {
      this.logger.error(error)
    }

    return selector
  }

  blowSelectorsUp(selectors) {
    const expandedSelectors = [...selectors]

    // List of very generic selectors that should NOT be expanded to class selectors
    // to avoid false matches (e.g., .name matching any element with class="name")
    const genericSelectors = ['name', 'email', 'phone', 'address', 'city', 'date', 'text']

    for (let selector of selectors) {
      if (
        !selector.includes(' ') &&
        !selector.includes('.') &&
        !selector.includes('#') &&
        !selector.includes('"')
      ) {
        // Always add ID and name attribute selectors
        expandedSelectors.push(
          '#' + selector,
          '[name="' + selector + '"]',
        )

        // Only add class selector for non-generic, longer selectors
        // to avoid overly broad matches
        const isGeneric = genericSelectors.includes(selector.toLowerCase())
        if (!isGeneric && selector.length > 5) {
          expandedSelectors.push('.' + selector)
        }

        // Only add wildcard variations for longer, more specific selectors
        // to avoid overly broad matches (e.g., #name* matching #lname, #firstname, etc.)
        if (selector.length > 5) {
          expandedSelectors.push('#' + selector + '*')
        }
      }
    }

    return expandedSelectors
  }
}

FillCleverlyInstruction.identifier = 'cleverfill'
FillCleverlyInstruction.description =
  'Fill in form fields based on global information'

// module.exports = FillCleverlyInstruction
export default FillCleverlyInstruction
