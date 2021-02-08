const { Wechaty } = require('wechaty')
const WechatyWebPanelPlugin = require('../src/index')
const token = ''
const name = 'wechat-assistant'
const bot = new Wechaty({
  name, // generate xxxx.memory-card.json and save login data for the next login
  puppet: 'wechaty-puppet-puppeteer',
})
bot
  .use(WechatyWebPanelPlugin({ apiKey: '', apiSecret: '' }))
  .start()
  .catch((e) => console.error(e))
