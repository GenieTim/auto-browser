export default async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    let result = await callback(array[index], index, array)
    if (result != null && "break" in result) {
      return true
    }
  }
  return false
}

// module.exports = asyncForEach
