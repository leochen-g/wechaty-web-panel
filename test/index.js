import { WechatyBuilder } from 'wechaty'
import WechatyWebPanelPlugin from '../src/index.js'

const name = 'wechat-assistant'

const bot = WechatyBuilder.build({
  name, // generate xxxx.memory-card.json and save login data for the next login
  puppet: 'wechaty-puppet-wechat',
  puppetOptions: {
    uos: true
  },
})
bot
  .use(WechatyWebPanelPlugin({
    apiKey: '',
    apiSecret: ''
  }))
bot.start()
  .catch((e) => console.error(e))
