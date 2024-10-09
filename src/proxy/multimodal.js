import axios from 'axios'
import FormData from 'form-data'
import { AIBOTK_OUTAPI } from './config.js'
import { getAibotConfig } from '../db/aiDb.js'

/**
 * 语音转换文字
 * @param file
 * @param aiConfig
 * @returns {Promise<*|string>}
 */
export async function getVoiceText(file, aiConfig) {
  try {
    const env = await getAibotConfig()
    const { apiKey } = env
    const base64 = await file.toBase64()
    const readable =  Buffer.from(base64, 'base64')
    const formData = new FormData();
    formData.append('file', readable, {contentType: file.mediaType, filename: file.name});
    formData.append('aiConfig', JSON.stringify(aiConfig))
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      timeout: 60000,
      url: AIBOTK_OUTAPI + '/voice/text',
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${apiKey}`,
      },
      data : formData
    };

    const result = await axios.request(config)
    if(result.data.code === 200) {
      return result.data.data
    } else {
      console.log('语音转换出错', result.data.message)
      return '';
    }
  } catch (e) {
    console.log(`语音转换出错: ${e}`)
    return '';
  }
}

/**
 * 文字转语音
 * @param text
 * @param aiConfig
 * @returns {Promise<*|string>}
 */
export async function getText2Speech(text, aiConfig) {
  try {
    const env = await getAibotConfig()
    const { apiKey } = env
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      timeout: 60000,
      url: AIBOTK_OUTAPI + '/text/speech',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      data : {
        text,
        aiConfig
      }
    };

    const result = await axios.request(config)
    if(result.data.code === 200) {
      return result.data.data
    } else {
      console.log('语音生成出错', result.data.message)
      return '';
    }
  } catch (e) {
    console.log(`语音生成出错: ${e}`)
    return '';
  }
}

/**
 * 识别图像
 * @param images
 * @param question
 * @param config
 * @returns {Promise<*|[{type: number, content: string}]>}
 */
export async function getImageVision(images, question, config) {
  try {
    const env = await getAibotConfig()
    const { apiKey } = env
    const reqConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      timeout: 60000,
      url: AIBOTK_OUTAPI + '/image/vision',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      data : {
        images,
        question,
        config
      }
    };
    const result = await axios.request(reqConfig)
    if(result.data.code === 200) {
      return result.data.data
    } else {
      console.log('识别图像出错', result.data.message)
      return [{type: 1, content: ''}];
    }
  } catch (e) {
    console.log('识别图像出错', e)
    return [{type: 1, content: ''}];
  }
}
