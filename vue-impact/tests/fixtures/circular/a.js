const { fromB } = require('./b')

function fromA() {
  return 'A' + fromB()
}

module.exports = { fromA }
