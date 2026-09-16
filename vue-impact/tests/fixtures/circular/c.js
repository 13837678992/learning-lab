const { fromA } = require('./a')

function fromC() {
  return 'C' + fromA()
}

module.exports = { fromC }
