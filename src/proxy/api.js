import { EMOHOST, TXSJHOST } from './config.js'
import { randomRange, MD5 } from '../lib/index.js'
import { allConfig } from '../db/configDb.js'
import { getFireNews } from './aibotk.js'
import { getPuppetEol } from '../const/puppet-type.js'
import axios from 'axios'

const service = axios.create({
  // 定义统一的请求头部
  headers: {
    'Content-Type': 'application/json; charset=utf-8'
  }, // 配置请求超时时间
  timeout: 60 * 1000, // 如果用的JSONP，可以配置此参数带上cookie凭证，如果是代理和CORS不用设置
  withCredentials: false
})
// 请求拦截
service.interceptors.request.use((config) => {
  return config
})
// 返回拦截
service.interceptors.response.use((response) => {
  if (response.status === 200) {
    // 获取接口返回结果
    const res = response.data
    // code为0，直接把结果返回回去，这样前端代码就不用在获取一次data.
    if (res.code === 200) {
      return Promise.resolve(res.result)
    } else {
      console.log(`天行API接口请求错误:${res.msg}`)
    }
  }
  console.log(`天行API网络请求错误:${response.status}`)
  return Promise.reject()
}, (err) => {
  console.log('天行API网络请求错误：', err)
  return Promise.reject(err)
})


async function txReq(option) {
  const config = await allConfig()
  if (!option) return
  const params = {
    key: config.txApiKey, ...option.params
  }
  if (option.method === 'POST') {
    return service.post(TXSJHOST + '/' + option.url + '/index', params, { headers: { contentType: option.contentType } })
  } else {
    return service.get(TXSJHOST + '/' + option.url + '/index', { params, headers: { contentType: option.contentType } })
  }
}

/**
 * 天行聊天机器人
 * @param {*} word 内容
 * @param {*} id id
 */
export async function getResByTX(word, id) {
  try {
    const eol = await getPuppetEol()
    let uniqueId = MD5(id)
    let option = {
      method: 'GET', url: 'robot', params: { question: word, uniqueid: uniqueId }
    }
    let result = await txReq(option)

    let response = ''
    if (result.datatype === 'text') {
      response = result.reply.replaceAll('\n', eol).replace(/<br>/g, eol)
    } else if (result.datatype === 'view') {
      let reply = ''
      result.reply.forEach((item) => {
        reply = reply + `《${item.title}》:${item.url}${eol}`
      })
      response = `虽然我不太懂你说的是什么，但是感觉很高级的样子，因此我也查找了类似的文章去学习，你觉得有用吗:\n${reply}`
    } else {
      response = '你太厉害了，说的话把我难倒了，我要去学习了，不然没法回答你的问题'
    }
    return response
  } catch (error) {
    console.log('获取天行机器人对话失败，请申请https://www.tianapi.com/apiview/47 这个接口')
  }
}

/**
 * 获取垃圾分类结果
 * @param {String} word 垃圾名称
 */
export async function getRubbishType(word) {
  const eol = await getPuppetEol()
  try {
    let option = {
      method: 'GET', url: 'lajifenlei', params: { word: word }
    }
    let content = await txReq(option)
    let type
    if (content.list[0].type == 0) {
      type = '是可回收垃圾'
    } else if (content.list[0].type == 1) {
      type = '是有害垃圾'
    } else if (content.list[0].type == 2) {
      type = '是厨余(湿)垃圾'
    } else if (content.list[0].type == 3) {
      type = '是其他(干)垃圾'
    }
    let response = `${content.list[0].name}${type}${eol}解释：${content.list[0].explain}${eol}主要包括：${content.list[0].contain}${eol}投放提示：${content.list[0].tip}`
    return response
  } catch (error) {
    console.log('垃圾分类请求失，请申请https://www.tianapi.com/apiview/97 这个接口')
  }
}

/**
 * 土味情话获取
 */
export async function getSweetWord() {
  const eol = await getPuppetEol()
  try {
    let option = {
      method: 'GET', url: 'saylove', params: {}
    }
    let content = await txReq(option)
    let sweet = content.content
    let str = sweet.replaceAll('\r\n', eol).replace(/<br>/g, eol).replaceAll('\n', eol)
    return str
  } catch (err) {
    console.log('获取土情话接口失败，请申请https://www.tianapi.com/apiview/80 这个接口')
  }
}

/**
 * 获取天行天气
 */
export async function getTXweather(city) {
  const eol = await getPuppetEol()
  try {
    let option = {
      method: 'GET', url: 'tianqi', params: { city: city }
    }
    const res = await txReq(option)
    let todayInfo = res.list[0];
    console.log('todayInfo', todayInfo)
    let obj = {
      weatherTips: todayInfo.tips,
      todayWeather: `今天:${todayInfo.weather}${eol}温度:${todayInfo.lowest}/${todayInfo.highest}${eol}${todayInfo.wind} ${todayInfo.windspeed}${eol}${eol}`
    }
    return obj
  } catch (err) {
    console.log('获取天气接口失败，请申请https://www.tianapi.com/apiview/72 这个接口')
  }
}

/**
 * 获取每日新闻内容
 * @param {*} id 新闻频道对应的ID
 */
export async function getNews(id, num = 10) {
  if (id > 1000) {
    return getFireNews(id, num)
  }
  const eol = await getPuppetEol()
  try {
    let option = {
      method: 'GET', url: 'allnews', params: { num: num, col: id }
    }
    let content = await txReq(option)
    let newList = content.newslist
    let news = ''
    // let shortUrl = 'https://www.tianapi.com/weixin/news/?col=' + id
    for (let i in newList) {
      let num = parseInt(i) + 1
      news = `${news}${eol}${num}.${newList[i].title}`
    }
    return `${news}${eol}`
  } catch (error) {
    console.log('获取天行新闻失败，请申请https://www.tianapi.com/apiview/51 这个接口')
    return ''
  }
}

/**
 * 获取名人名言
 */
export async function getMingYan() {
  const eol = await getPuppetEol()
  try {
    let option = {
      method: 'GET', url: 'mingyan', params: { num: 1 }
    }
    let content = await txReq(option)

    let newList = content.list
    let news = `${newList[0].content}${eol}——————————${newList[0].author}`
    return news
  } catch (error) {
    console.log('获取名人名言失败，请申请https://www.tianapi.com/apiview/92 这个接口')
  }
}

/**
 * 获取星座运势
 * @param {string} satro 星座
 */
export async function getStar(astro) {
  const eol = await getPuppetEol()
  try {
    let option = {
      method: 'GET', url: 'star', params: { astro: astro }
    }
    let content = await txReq(option)

    let newList = content.list
    let news = ''
    for (let item of newList) {
      news = `${news}${item.type}:${item.content}${eol}`
    }
    return news
  } catch (error) {
    console.log('获取天行星座运势失败，请申请https://www.tianapi.com/apiview/78 这个接口')
  }
}

/**
 * 获取姓氏起源
 * @param {string} 姓
 */
export async function getXing(name) {
  try {
    let option = {
      method: 'GET', url: 'surname', params: { xing: name }
    }
    let content = await txReq(option)
    return `${content.content}`
  } catch (error) {
    console.log('获取天行姓氏起源失败， 请申请https://www.tianapi.com/apiview/94 这个接口')
  }
}

/**
 * 获取顺口溜
 */
export async function getSkl() {
  try {
    let option = {
      method: 'GET', url: 'skl', params: {}
    }
    let content = await txReq(option)
    return `${content.content}`
  } catch (error) {
    console.log('获取天行顺口溜失败，请申请https://www.tianapi.com/apiview/54 这个接口', error)
  }
}

/**
 * 获取老黄历
 */
export async function getLunar(date) {
  const eol = await getPuppetEol()
  try {
    let option = {
      method: 'GET', url: 'lunar', params: { date: date }
    }
    let content = await txReq(option)
    let item = content
    let news = `阳历：${item.gregoriandate}${eol}阴历：${item.lunardate}${eol}节日：${item.lunar_festival}${eol}适宜：${item.fitness}${eol}不宜：${item.taboo}${eol}神位：${item.shenwei}${eol}胎神：${item.taishen}${eol}冲煞：${item.chongsha}${eol}岁煞：${item.suisha}`
    return news
  } catch (error) {
    console.log('获取天行老黄历失败, 请申请https://www.tianapi.com/apiview/45 这个接口')
  }
}

/**
 * 天行神回复
 */
export async function getGoldReply() {
  const eol = await getPuppetEol()
  try {
    let option = {
      method: 'GET', url: 'godreply', params: { num: 1 }
    }
    let content = await txReq(option)

    let item = content.list[0]
    let news = `问题："${item.title}"${eol}回复：${item.content}`
    return news
  } catch (error) {
    console.log('获取天行神回复失败，请申请https://www.tianapi.com/apiview/39 这个接口')
  }
}

/**
 * 天行歇后语
 */
export async function getXhy() {
  try {
    let option = {
      method: 'GET', url: 'xiehou', params: { num: 1 }
    }
    let content = await txReq(option)
    let item = content.list[0]
    let news = `${item.quest}————${item.result}`
    return news
  } catch (error) {
    console.log('获取天行歇后语失败, 请申请https://www.tianapi.com/apiview/38 这个接口')
  }
}

/**
 * 天行绕口令
 */
export async function getRkl() {
  try {
    let option = {
      method: 'GET', url: 'rkl', params: { num: 1 }
    }
    let content = await txReq(option)
    let item = content.list[0]
    let news = `${item.content}`
    return news
  } catch (error) {
    console.log('获取天行绕口令失败，请申请https://www.tianapi.com/apiview/37 这个接口')
  }
}

/**
 * 获取自定义头像
 * @param {*} base
 * @param type
 */
export async function getAvatar(base, type) {
  try {
    let option = {
      method: 'POST', url: 'imgtx', params: {
        createid: type || 2, img: 'data:image/jpeg;base64,' + base
      }
    }
    let content = await txReq(option)
    return content.picurl
  } catch (e) {
    console.log('获取自定义头像失败，请申请https://www.tianapi.com/apiview/123 这个接口')
  }
}

/**
 * 获取表情包
 * @param {*} msg
 */
export async function getEmo(msg) {
  try {
    let res = await axios.get(`${EMOHOST}keyword=${encodeURIComponent(msg)}`, { headers: { 'Content-Type': 'application/json;charset=UTF-8' } })
    const content = res.data
    if (content.totalSize > 0) {
      if (content.items && content.items.length > 0) {
        let arr = []
        for (let i of content.items) {
          if (i.url.includes('.jpg') || i.url.includes('.gif')) {
            arr.push(i)
          }
        }
        let item = arr[randomRange(0, arr.length)]
        if (item.url) {
          return item.url
        } else {
          return 'http://img.doutula.com/production/uploads/image/2017/11/30/20171130047004_PiJlhx.gif'
        }
      } else {
        return 'http://img.doutula.com/production/uploads/image/2017/11/30/20171130047004_PiJlhx.gif'
      }
    }
  } catch (e) {
    console.log('获取表情包失败', e)
  }
}

/**
 * 天行网络取名
 */
export async function getCname() {
  try {
    let option = {
      method: 'GET', url: 'cname'
    }
    let content = await txReq(option)

    let item = content.list[0]
    let cname = item.naming
    return cname
  } catch (error) {
    console.log('获取天行网络取名失败，请申请https://www.tianapi.com/apiview/36 这个接口')
  }
}

/**
 * 天行违章码查询
 */
export async function getJtwfcode(code) {
  try {
    const eol = await getPuppetEol()
    let option = {
      method: 'GET', url: 'jtwfcode', params: { code }
    }
    let content = await txReq(option)

    return `违章码：${code}${eol}违章行为：${content.behavior}${eol}扣分：${content.deduct}${eol}罚款：${content.fine}元${eol}其他处罚：${content.others}`
  } catch (error) {
    console.log('获取天行违章码查询失败，请申请https://www.tianapi.com/apiview/36 这个接口')
  }
}

/**
 * 天行健康小妙招
 */
export async function getHealthskill(word) {
  try {
    const eol = await getPuppetEol()
    let option = {
      method: 'GET', url: 'healthskill', params: { word }
    }
    let content = await txReq(option)

    let list = content.list
    let tips = ''
    for (let item of list) {
      tips = `🌟🌟${item.content}🌟🌟${eol}`
    }

    return tips
  } catch (error) {
    console.log('获取天行健康小妙招名失败，请申请https://www.tianapi.com/apiview/252 这个接口')
  }
}
