const { Wechaty } = require('wechaty')
const WechatyWebPanelPlugin = require('../src/index')
const token = ''
const name = 'wechat-assistant'
const bot = new Wechaty({
  name, // generate xxxx.memory-card.json and save login data for the next login
})
bot
  .use(WechatyWebPanelPlugin())
  .start()
  .catch((e) => console.error(e))
