'use strict'

const test = require('tape')
const Identity = require('@tradle/identity').Identity
const memdown = require('memdown')
const find = require('array-find')
const helpers = require('@tradle/test-helpers')
const Tim = require('tim')
const createServer = require('../server')
const createClient = require('../client')
const users = require('./fixtures/users')
const NETWORK_NAME = 'testnet'

test('rpc', function (t) {
  const user = users[0]
  const keys = user.priv
  const wallet = walletFor(keys, null, 'messaging')
  const tim = new Tim({
    pathPrefix: './blah',
    leveldown: memdown,
    networkName: NETWORK_NAME,
    keeper: helpers.fakeKeeper.empty(),
    wallet: wallet,
    blockchain: wallet.blockchain,
    identity: Identity.fromJSON(user.pub),
    keys: keys
  })

  const port = 32332
  let server
  const client = createClient({
    port: port
  })

  client.identityPublishStatus()
    .done(function (status) {
      client.close()
      server.close()
      tim.destroy()
      t.equal(status.current, false)
      t.equal(status.queued, false)
      t.equal(status.ever, false)
      t.end()
    })

  setTimeout(function () {
    // test connection buffering
    server = createServer({
      tim: tim,
      port: port
    })
  }, 1000)
})

function walletFor (keys, blockchain, purpose) {
  var unspents = []
  for (var i = 0; i < 20; i++) {
    unspents.push(100000)
  }

  return helpers.fakeWallet({
    blockchain: blockchain,
    unspents: unspents,
    priv: find(keys, function (k) {
      return k.type === 'bitcoin' &&
        k.networkName === NETWORK_NAME &&
        k.purpose === purpose
    }).priv
  })
}

function promiseDelay (millis) {
  return Q.Promise(function (resolve) {
    setTimeout(resolve, millis)
  })
}
