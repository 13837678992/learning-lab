export function get(url, params) {
  return Promise.resolve({ url, params })
}

export function post(url, data) {
  return Promise.resolve({ url, data })
}

export function someGlobalMethod() {
  return 'global'
}
