
const util = require('util')
const typeforce = require('typeforce')
const upnode = require('upnode')
const Q = require('q')
const manifest = require('./manifest')
const EventEmitter = require('events').EventEmitter
const slice = Array.prototype.slice

module.exports = function (opts) {
  typeforce({
    port: 'Number'
  }, opts)

  const proxy = {}
  const up = upnode.connect(opts.port, function (remote, conn) {
    // subscribe to events from remote tim
    EventEmitter.call(remote)
    Object.assign(remote, EventEmitter.prototype)
    remote.subscribe(remote.emit.bind(remote))

    conn.emit('up', remote)
    // cb(null, remote, conn)
  })

  Object.keys(manifest).forEach(name => {
    if (!manifest[name].promise) return

    proxy[name] = function () {
      const args = slice.call(arguments)
      return Q.Promise(function (resolve) {
          up(resolve)
        })
        .then(function (remote) {
          return Q.nfapply(remote[name], args)
        })
    }
  })

  proxy.close = up.close.bind(up)
  return proxy
}
