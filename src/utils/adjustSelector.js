/**
 * Adjust selector by replacing template variables with actual values
 *
 * Available variables:
 * - $today: Current day of month (1-31)
 * - $month: Current month (1-12)
 * - $year: Current year (full, e.g., 2025)
 * - $dayOfWeek: Current day of week (0-6, Sunday=0)
 * - $env{NAME}: Environment variable value
 *
 * @param {string} selector the selector to adjust
 * @returns {string} the adjusted string/selector
 */
export default function adjustSelector(selector) {
  try {
    const today = new Date()
    
    // Date-based replacements
    selector = selector.replace(/\$today/g, today.getDate().toString())
    selector = selector.replace(/\$month/g, (today.getMonth() + 1).toString())
    selector = selector.replace(/\$year/g, today.getFullYear().toString())
    selector = selector.replace(/\$dayOfWeek/g, today.getDay().toString())
    
    // Environment variable replacements
    // Matches $env{VAR_NAME} and replaces with process.env.VAR_NAME
    selector = selector.replace(/\$env\{([^}]+)\}/g, (match, varName) => {
      const envValue = process.env[varName]
      if (envValue === undefined) {
        console.warn(`Environment variable ${varName} not found, leaving placeholder in selector`)
        return match
      }
      return envValue
    })
  } catch (error) {
    console.warn('Error adjusting selector:', error)
  }

  return selector
}
