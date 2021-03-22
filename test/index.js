const { Wechaty } = require('wechaty')
const { PuppetPadlocal } = require('wechaty-puppet-padlocal')
const WechatyWebPanelPlugin = require('../src/index')
const token = 'padlocal_token'
const name = 'wechat-assistant'
const puppet = new PuppetPadlocal({
  token,
})
const bot = new Wechaty({
  name, // generate xxxx.memory-card.json and save login data for the next login
  puppet,
  // puppet: 'wechaty-puppet-puppeteer',
})
bot
  .use(WechatyWebPanelPlugin({ apiKey: 'apikey', apiSecret: 'apisecret' }))
  .start()
  .catch((e) => console.error(e))
