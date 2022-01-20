const {WechatyBuilder} = require('wechaty')
const WechatyWebPanelPlugin = require('../src/index')

const name = 'wechat-assistant'

const bot = WechatyBuilder.build({
    name, // generate xxxx.memory-card.json and save login data for the next login
    puppet: 'wechaty-puppet-wechat',
})
bot
    .use(WechatyWebPanelPlugin({
        apiKey: '',
        apiSecret: ''
    }))
    .start()
    .catch((e) => console.error(e))
