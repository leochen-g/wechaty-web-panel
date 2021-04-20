const superagent = require('superagent')
const { getFormatQuery } = require('../lib/index')
const { getAibotConfig } = require('../common/aiDb')
const { AIBOTK, TXHOST } = require('./config')
const { allConfig } = require('../common/configDb')

/**
 * 封装get请求
 * @param {*} url 地址
 * @param {*} params 参数
 * @param {*} contentType 发送请求数据类型
 */
function get({url, params, contentType = 'application/x-www-form-urlencoded', platform='tx', authorization = '', spider= false}) {
  return new Promise((resolve, reject) => {
    superagent
      .get(url)
      .query(params)
      .set('Content-Type', contentType)
      .set('Authorization', authorization)
      .end((err, res) => {
        if (err) {
          console.log('请求出错', err)
          reject(err)
        }
        if (spider) { // 如果是爬取内容，直接返回页面html
          resolve(res.text)
        }else { // 如果是非爬虫，返回格式化后的内容
          res = JSON.parse(res.text);
          if(platform!=='chuan') {
              if (res.code !== 200 && platform === 'tx' || res.code !== 200 && platform === 'aibot' || res.code !== 0 && platform === 'qi' || res.code !== 100000 && platform === 'tl') {
                  console.error(`接口请求失败`, res.msg || res.text)
              }
          }
          resolve(res)
        }
      })
  })
}

/**
 * 封装post请求
 * @param {*} url 地址
 * @param {*} params 参数
 * @param {*} contentType 发送请求数据类型
 * @param authorization
 */
function post({ url, params, contentType = 'application/x-www-form-urlencoded', authorization = '', platform='tx', spider= false, skipCheck = false}) {
  return new Promise((resolve, reject) => {
    superagent
      .post(url)
      .send(params)
      .set('Content-Type', contentType)
      .set('Authorization', authorization)
      .end((err, res) => {
          if (err) {
              console.log('请求出错', err)
              reject(err)
          }
          if (spider) { // 如果是爬取内容，直接返回页面html
              resolve(res.text)
          }else { // 如果是非爬虫，返回格式化后的内容
              res = JSON.parse(res.text);
              if(platform!=='chuan') {
                  if (res.code !== 200 && platform === 'tx' || res.code !== 200 && platform === 'aibot' || res.code !== 100000 && platform === 'tl') {
                      console.error(`接口请求失败`, res.msg || res.text)
                  }
              }
              resolve(res)
          }
      })
  })
}

function req(option) {
  if (!option) return
  if (option.method === 'POST') {
    return post(option)
  } else {
    return get(option)
  }
}

async function txReq(option) {
  const config = await allConfig()
  if (!option) return
  const params = {
    key: config.txApiKey,
    ...option.params,
  }
  if (option.method === 'POST') {
    return post({ url: TXHOST + option.url, params, contentType: option.contentType})
  } else {
    return get({ url: TXHOST + option.url, params, contentType: option.contentType})
  }
}

async function aiBotReq(option) {
  const env = await getAibotConfig()
  const { apiKey, apiSecret } = env
  if (!option) return
  if (!apiKey || !apiSecret) {
    console.warn('未设置apikey或apiSecret，请登录https://wechat.aibotk.com 获取后重试')
    return
  }
  let params = getFormatQuery(apiKey, apiSecret, option.params)
  if (option.method === 'POST') {
    return post({url: AIBOTK + option.url, params, contentType: 'application/json;charset=utf-8', platform: option.platform || 'aibot'})
  } else {
    return get({ url: AIBOTK + option.url, params, contentType: option.contentType, platform: option.platform || 'aibot' })
  }
}

module.exports = {
  req,
  txReq,
  aiBotReq,
}
