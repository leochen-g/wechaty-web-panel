import { ChatGPTAPI } from 'chatgpt'
import pTimeout from 'p-timeout'
import { allConfig } from "../db/configDb.js";

async function geGPTReply(content) {
  const config = await allConfig()
  if (!config.gpttoken) {
    console.log('请到智能微秘书平台配置ChatGPT token参数方可使用')
    return [{ type: 1, content: '请到平台配置ChatGPT token参数方可使用' }]
  }
  const api = new ChatGPTAPI({ sessionToken: config.gpttoken })

  await api.ensureAuth()

  const threeMinutesMs = 2 * 60 * 1000

  const response = await pTimeout(
    api.sendMessage(content),
    {
      milliseconds: threeMinutesMs,
      message: 'ChatGPT返回超时了，用的人太多，太火爆了，等会再试吧'
    }
  )
  let replys = response.match(/.{1,680}/g)
  replys = replys.map(item=> {
    return {
      type: 1,
      content: item
    }
  })

  return replys
}

export { geGPTReply }
export default {
  geGPTReply,
}
