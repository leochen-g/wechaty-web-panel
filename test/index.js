const {Wechaty} = require('wechaty')
const {PuppetPadlocal} = require('wechaty-puppet-padlocal')
const WechatyWebPanelPlugin = require('../src/index')
// const token = 'padtoken'
const name = 'wechat-assistant'
// const puppet = new PuppetPadlocal({
//     token,
// })
const bot = new Wechaty({
    name, // generate xxxx.memory-card.json and save login data for the next login
    // puppet,
    puppet: 'wechaty-puppet-wechat',
})
bot
    .use(WechatyWebPanelPlugin({
        apiKey: 'apiKey',
        apiSecret: 'apiSecret'
    }))
    .start()
    .catch((e) => console.error(e))