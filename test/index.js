const { Wechaty } = require('wechaty')
const { PuppetPadplus } = require('wechaty-puppet-padplus')
const WechatyWebPanelPlugin = require('../src/index')
const token = 'puppet_padplus_204f507dc4374acc'
const puppet = new PuppetPadplus({
  token,
})
const name = 'wechat-assistant'
const bot = new Wechaty({
  name, // generate xxxx.memory-card.json and save login data for the next login
})
bot
  .use(WechatyWebPanelPlugin())
  .start()
  .catch((e) => console.error(e))
