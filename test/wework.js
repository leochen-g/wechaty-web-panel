import {WechatyBuilder} from '@juzi/wechaty'
import {WechatyWebPanelPlugin, WechatyMessageRecordPlugin} from '../src/index.js'

const name = 'worker-assistant';
let bot = '';
let workProToken = '' // 如果申请了企业微信的token 可以直接填入

if (process.env['WORK_PRO_TOKEN']) {
    console.log('读取到环境变量中的企微token')
    workProToken = process.env['WORK_PRO_TOKEN']
}
bot = WechatyBuilder.build({
    name, // generate xxxx.memory-card.json and save login data for the next login
    puppet: '@juzi/wechaty-puppet-service',
    puppetOptions: {
        authority: 'token-service-discovery-test.juzibot.com',
        tls: { disable: true },
        token: workProToken
    },
});

bot.use(WechatyWebPanelPlugin({
  apiKey: '***', apiSecret: '***',
}))
bot.use(WechatyMessageRecordPlugin())
bot.start()
    .catch((e) => console.error(e));
