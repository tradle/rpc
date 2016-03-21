
const util = require('util')
const typeforce = require('typeforce')
const dnode = require('dnode')
const Q = require('q')
const manifest = require('./manifest')
const EventEmitter = require('events').EventEmitter

module.exports = function (opts, cb) {
  typeforce({
    port: 'Number'
  }, opts)

  return dnode.connect(opts.port, function (remote, conn) {
    Object.keys(manifest).forEach(name => {
      if (!manifest[name].promise) return

      const cbVersion = remote[name].bind(remote)
      remote[name] = function () {
        return Q.nfapply(cbVersion, [].slice.call(arguments))
      }
    })

    // subscribe to events from remote tim
    EventEmitter.call(remote)
    Object.assign(remote, EventEmitter.prototype)
    remote.subscribe(remote.emit.bind(remote))

    cb(null, remote, conn)
  })
}
