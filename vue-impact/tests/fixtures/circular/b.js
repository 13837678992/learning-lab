const { fromC } = require('./c')

function fromB() {
  return 'B' + fromC()
}

module.exports = { fromB }
