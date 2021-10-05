// https://stackoverflow.com/questions/8498592/extract-hostname-name-from-string
function extractHostname(url) {
  var hostname
  // find & remove protocol (http, ftp, etc.) and get hostname

  hostname = url.includes('//') ? url.split('/')[2] : url.split('/')[0]

  // find & remove port number
  hostname = hostname.split(':')[0]
  // find & remove "?"
  hostname = hostname.split('?')[0]

  return hostname
}

module.exports = extractHostname
