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
    // 需要忽略的关键词 [{type:'start', word: ''},{type:'end', word: ''},{type:'equal', word: ''},{type:'include', word: ''}]
    ignoreMessages: config.ignoreMessages || [],
    // 需要忽略的事件 ['scan', 'login', 'logout', 'friendship', 'room-join', 'room-topic', 'room-leave', 'message', 'ready', 'heartbeat', 'error']
    ignoreEvents: config.ignoreEvents || [],
  }
  addAibotConfig(initConfig)
  return function (bot) {
    const ignoreEvents = initConfig.ignoreEvents
    if (!ignoreEvents.includes('scan')) bot.on('scan', onScan)
    if (!ignoreEvents.includes('login')) bot.on('login', onLogin)
    if (!ignoreEvents.includes('logout')) bot.on('logout', onLogout)
    if (!ignoreEvents.includes('friendship')) bot.on('friendship', onFriend)
    if (!ignoreEvents.includes('room-join')) bot.on('room-join', onRoomjoin)
    if (!ignoreEvents.includes('room-topic')) bot.on('room-topic', onRoomtopic)
    if (!ignoreEvents.includes('room-leave')) bot.on('room-leave', onRoomleave)
    if (!ignoreEvents.includes('message')) bot.on('message', onMessage)
    if (!ignoreEvents.includes('ready')) bot.on('ready', onReady)
    if (!ignoreEvents.includes('heartbeat')) bot.on('heartbeat', onHeartbeat)
    if (!ignoreEvents.includes('error')) bot.on('error', onError)
  }
}
