const { addAibotConfig } = require('./common/aiDb')
const onScan = require('./handlers/on-scan')
const onLogin = require('./handlers/on-login')
const onLogout = require('./handlers/on-logout')
const onFriend = require('./handlers/on-friend')
const onRoomjoin = require('./handlers/on-roomjoin')
const onMessage = require('./handlers/on-message')
const onReady = require('./handlers/on-ready')
const onHeartbeat = require('./handlers/on-heartbeat')
const onError = require('./handlers/on-error')
const onRoomtopic = require('./handlers/on-roomtopic')
const onRoomleave = require('./handlers/on-roomleave')
let envKey = ''
let envSecret = ''
if (process.env['AIBOTK_KEY']) {
  console.log('使用环境变量中的 aibotkKey')
  envKey = process.env['AIBOTK_KEY']
}
if (process.env['AIBOTK_SECRET']) {
  console.log('使用环境变量中的 aibotkSecret')
  envSecret = process.env['AIBOTK_SECRET']
}

module.exports = function WechatyWebPanelPlugin(config = { apiKey, apiSecret }) {
  const initConfig = {
    apiKey: envKey || config.apiKey,
    apiSecret: envSecret || config.apiSecret,
  }
  addAibotConfig(initConfig)
  return function (bot) {
    bot.on('scan', onScan)
    bot.on('login', onLogin)
    bot.on('logout', onLogout)
    bot.on('friendship', onFriend)
    bot.on('room-join', onRoomjoin)
    bot.on('room-topic', onRoomtopic)
    bot.on('room-leave', onRoomleave)
    bot.on('message', onMessage)
    bot.on('ready', onReady)
    bot.on('heartbeat', onHeartbeat)
    bot.on('error', onError)
  }
}
