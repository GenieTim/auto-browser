/**
 * Hacky temporary adjustment for some ideas
 *
 * @todo outsource to its own instructionset
 * @param {string} selector the selector to adjust
 * @returns {string} the adjusted string/selector
 */
export default function adjustSelector(selector) {
  try {
    let today = new Date()
    selector = selector.replace('$today', today.getDate().toString())
    console.log('Replaced $today with ' + today.getDate().toString() + ' to ' + selector)
  } catch (error) {
    console.warn(error)
  }

  return selector
}
