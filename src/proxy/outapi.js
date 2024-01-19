import axios from 'axios'
import { allConfig } from '../db/configDb.js'
import { AIBOTK_OUTAPI } from './config.js'

const service = axios.create({
  // 定义统一的请求头部
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
  },
  // 配置请求超时时间
  timeout: 300 * 1000,
  // 如果用的JSONP，可以配置此参数带上cookie凭证，如果是代理和CORS不用设置
  withCredentials: false,
})
// 请求拦截
service.interceptors.request.use((config) => {
  return config
})
// 返回拦截
service.interceptors.response.use(
  (response) => {
    if (response.status === 200) {
      // 获取接口返回结果
      const res = response.data
      // code为0，直接把结果返回回去，这样前端代码就不用在获取一次data.
      if (res.code === 200) {
        if (Array.isArray(res.data)) {
          return Promise.resolve(res.data)
        } else {
          const result = [{ type: 1, content: '' }]
          return Promise.resolve(result)
        }
      } else {
        const result = [{ type: 1, content: res.msg || '' }]
        return Promise.resolve(result)
      }
    }
    const res = [{ type: 1, content: '外部 api 网络请求错误：' + response.status }]
    return Promise.resolve(res)
  },
  (err) => {
    console.log('err', err)
    const res = [{ type: 1, content: '网络错误，请稍后重试' }]
    return Promise.resolve(res)
  }
)

/**
 * 适配外部 api接口
 * @param params
 * @returns {Promise<AxiosResponse<any>>}
 */
export async function outApi(params) {
  const config = await allConfig()
  if (!params) return
  const data = {
    key: config.txApiKey,
    ...params,
  }
  const url = AIBOTK_OUTAPI + '/skill'
  const res = await service.post(url, data)
  return res;
}
