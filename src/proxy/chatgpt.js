import remark from 'remark'
import stripMarkdown from 'strip-markdown'
import { Configuration, OpenAIApi } from 'openai'
import { allConfig } from "../db/configDb.js";

let  openai = null

function markdownToText(markdown) {
  return remark()
    .use(stripMarkdown)
    .processSync(markdown || '')
    .toString()
}

async function geGPTReply(content) {
  try {
    const config = await allConfig()
    if (!config.gpttoken) {
      console.log('请到智能微秘书平台配置Openai apikey参数方可使用')
      return [{ type: 1, content: '请到平台配置Openai apikey参数方可使用' }]
    }
    if(!openai) {
      let configuration = new Configuration({
        apiKey: config.gpttoken,
      })
      openai = new OpenAIApi(configuration)
    }

    let response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: content,
      temperature: 0.9, // 每次返回的答案的相似度0-1（0：每次都一样，1：每次都不一样）
      max_tokens: 2000,
      top_p: 1,
      frequency_penalty: 0.0,
      presence_penalty: 0.6,
      stop: ['Human:', 'AI:'],
    })
    console.log('chat gpt返回原始数据：'+ response.data.choices[0].text);
    response = markdownToText(response.data.choices[0].text)

    let replys = []
    let message = response;
    while (message.length > 500) {
      replys.push(message.slice(0, 500));
      message = message.slice(500);
    }
    replys.push(message);
    replys = replys.map(item=> {
      return {
        type: 1,
        content: item.trim()
      }
    })
    return replys
  } catch (e) {
    console.log('chat gpt报错：'+ e);
    return [{ type: 1, content: ''}]
  }
}

export { geGPTReply }
export default {
  geGPTReply,
}
