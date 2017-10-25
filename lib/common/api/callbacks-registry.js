'use strict'

const v8Util = process.atomBinding('v8_util')

class CallbacksRegistry {
  constructor () {
    this.nextId = 0
    this.callbacks = {}
  }

  add (callback) {
    // The callback is already added.
    let id = v8Util.getHiddenValue(callback, 'callbackId')
    if (id) return id
    id = ++this.nextId

    // Capture the location of the function and put it in the ID string,
    // so that release errors can be tracked down easily.
    const regexp = /at (.*)/gi
    const stackString = (new Error()).stack
    let match = regexp.exec(stackString)
    let filenameAndLine

    while (match) {
      const location = match[1]
      if (location.indexOf('(native)') !== -1) continue
      if (location.indexOf('electron.asar') !== -1) continue
      const ref = /([^/^)]*)\)?$/gi.exec(location)
      filenameAndLine = ref[1]
      match = regexp.exec(stackString)
      break
    }

    this.callbacks[id] = callback
    v8Util.setHiddenValue(callback, 'callbackId', id)
    v8Util.setHiddenValue(callback, 'location', filenameAndLine)
    return id
  }

  get (id) {
    return this.callbacks[id]
  }

  apply (id, ...args) {
    return this.get(id).apply(global, ...args)
  }

  remove (id) {
    const callback = this.callbacks[id]
    if (callback) {
      v8Util.deleteHiddenValue(callback, 'callbackId')
      delete this.callbacks[id]
    }
  }
}

module.exports = CallbacksRegistry
