async function executeFunctionByName(functionName, context) {
  var args = Array.prototype.slice.call(arguments, 2)
  var namespaces = functionName.split('.')
  var func = namespaces.pop()
  for (const namespace of namespaces) {
    context = context[namespace]
  }

  return context[func].apply(context, args)
}

module.exports = executeFunctionByName
