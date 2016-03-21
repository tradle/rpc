'use strict'

const typeforce = require('typeforce')
const dnode = require('dnode')
const Q = require('q')
const extend = require('xtend/mutable')
const manifest = require('./manifest')
const LOCAL_IP_REGEX = /^(?:::ffff:)?127\.0\.0\.1$/

module.exports = function (opts) {
  typeforce({
    tim: 'Object',
    port: 'Number',
    public: '?Boolean'
  }, opts)

  const isPublic = opts.public
  const tim = opts.tim
  const methods = buildRemote(tim, manifest)
  const subs = {}
  ;['message', 'chained', 'unchained'].forEach(function (event) {
    tim.on(event, function () {
      const args = [].slice.call(arguments)
      args.unshift(event)
      for (let id in subs) {
        const emit = subs[id]
        emit.apply(emit, args)
      }
    })
  })

  return dnode(function (client, conn) {
    extend(this, methods)
    this.subscribe = function (emit) {
      subs[conn.id] = emit
      conn.on('end', function () {
        delete subs[conn.id]
      })
    }
  })
  .listen(opts.port)
  .on('remote', function (remote, d) {
    if (!isPublic && !LOCAL_IP_REGEX.test(d.stream.remoteAddress)) {
      d.end()
    }
  })
}

function buildRemote (tim, manifest) {
  const target = {}
  const subs = {}
  Object.keys(manifest).forEach(method => {
    if (!(method in tim)) throw new Error(`no such method "${method}"`)

    // exception
    if (method === 'identity') {
      target[method] = function (cb) {
        cb(null, tim.identityJSON)
      }

      return
    }

    const meta = manifest[method]
    if (!meta.promise) {
      // target[method] = function () {
      //   return tim[method].apply(tim, arguments)
      // }

      throw new Error('only promise-returning methods supported at this time')
    }

    target[method] = function () {
      const args = [].slice.call(arguments)
      const cb = args.pop()
      return tim[method].apply(tim, args)
        .nodeify(cb)
    }
  })

  return target
}
