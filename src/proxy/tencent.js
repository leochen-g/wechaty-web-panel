import * as tencentcloud from 'tencentcloud-sdk-nodejs'
import { allConfig } from '../common/configDb.js'
const NlpClient = tencentcloud.nlp.v20190408.Client
let client = ''
async function initClient() {
  const config = await allConfig()
  //初始化腾讯闲聊机器人，创建链接
  const clientConfig = {
    credential: {
      secretId: config.tencentSecretId,
      secretKey: config.tencentSecretKey,
    },
    region: 'ap-guangzhou',
    profile: {
      httpProfile: {
        endpoint: 'nlp.tencentcloudapi.com',
      },
    },
  }
  client = new NlpClient(clientConfig)
}
async function chatTencent(word) {
  try {
    const params = {
      Query: word,
    }
    if (!client) {
      await initClient()
    }
    const res = await client.ChatBot(params)
    return res.Reply
  } catch (e) {
    console.log('腾讯闲聊机器人请求失败：', e)
  }
}
export { chatTencent }
export default {
  chatTencent,
}
