import { req, txReq } from './superagent.js'
import { EMOHOST, TULING, ONE, MEINV } from './config.js'
import { randomRange, MD5 } from '../lib/index.js'
import { allConfig } from '../db/configDb.js'
import { getFireNews } from "./aibotk.js";
/**
 * 天行图灵聊天机器人
 * @param {*} word 发送内容
 * @param {*} id id
 */
async function getResByTXTL(word, id) {
  try {
    let uniqueId = MD5(id)
    let option = {
      method: 'GET',
      url: '/txapi/tuling/',
      params: { question: word, user: uniqueId },
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let response = content.newslist[0].reply
      console.log('天行图灵机器人回复：', response)
      return response
    } else {
      return '我好像迷失在无边的网络中了，接口调用错误：' + content.msg
    }
  } catch (error) {
    console.log('天行图灵聊天机器人请求失败：', error)
  }
}
/**
 * 天行聊天机器人
 * @param {*} word 内容
 * @param {*} id id
 */
async function getResByTX(word, id) {
  try {
    let uniqueId = MD5(id)
    let option = {
      method: 'GET',
      url: '/txapi/robot/',
      params: { question: word, userid: uniqueId },
    }
    let res = await txReq(option)
    if (res.code === 200) {
      let response = ''
      let content = res.newslist[0]
      if (content.datatype === 'text') {
        response = content.reply
      } else if (content.datatype === 'view') {
        let reply = ''
        content.reply.forEach((item) => {
          reply = reply + `《${item.title}》:${item.url}\n`
        })
        response = `虽然我不太懂你说的是什么，但是感觉很高级的样子，因此我也查找了类似的文章去学习，你觉得有用吗:\n${reply}`
      } else {
        response = '你太厉害了，说的话把我难倒了，我要去学习了，不然没法回答你的问题'
      }
      return response
    } else {
      console.log('天行机器人接口调用错误：', res.msg)
      return '我好像迷失在无边的网络中了，你能找回我么'
    }
  } catch (error) {
    console.log('天行聊天机器人请求失败：', error)
  }
}
/**
 * 图灵智能聊天机器人
 * @param {*} word 内容
 * @param {*} id id
 */
async function getResByTL(word, id) {
  const config = await allConfig()
  try {
    let uniqueId = MD5(id)
    let data = {
      reqType: 0,
      perception: {
        inputText: {
          text: word,
        },
      },
      userInfo: {
        apiKey: config.tuLingKey,
        userId: uniqueId,
      },
    }
    let option = {
      method: 'POST',
      url: TULING,
      params: data,
      contentType: 'application/json;charset=UTF-8',
    }
    let content = await req(option)
    let reply = content.results[0].values.text
    return reply
  } catch (error) {
    console.log('图灵聊天机器人请求失败：', error)
  }
}
/**
 * 获取垃圾分类结果
 * @param {String} word 垃圾名称
 */
async function getRubbishType(word) {
  try {
    let option = {
      method: 'GET',
      url: '/txapi/lajifenlei/',
      params: { word: word },
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let type
      if (content.newslist[0].type == 0) {
        type = '是可回收垃圾'
      } else if (content.newslist[0].type == 1) {
        type = '是有害垃圾'
      } else if (content.newslist[0].type == 2) {
        type = '是厨余(湿)垃圾'
      } else if (content.newslist[0].type == 3) {
        type = '是其他(干)垃圾'
      }
      let response = `${content.newslist[0].name}${type}\n解释：${content.newslist[0].explain}\n主要包括：${content.newslist[0].contain}\n投放提示：${content.newslist[0].tip}`
      return response
    } else {
      console.log('查询失败提示：', content.msg)
      return '暂时还没找到这个分类信息呢'
    }
  } catch (error) {
    console.log('垃圾分类请求失败：', error)
  }
}
/**
 * 土味情话获取
 */
async function getSweetWord() {
  try {
    let option = {
      method: 'GET',
      url: '/txapi/saylove/',
      params: {},
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let sweet = content.newslist[0].content
      let str = sweet.replace('\r\n', '\n')
      return str
    } else {
      console.log('获取土情话接口失败', content.msg)
    }
  } catch (err) {
    console.log('获取土情话接口失败', err)
  }
}
/**
 * 获取天行天气
 */
async function getTXweather(city) {
  try {
    let option = {
      method: 'GET',
      url: '/txapi/tianqi/',
      params: { city: city },
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let todayInfo = content.newslist[0]
      let obj = {
        weatherTips: todayInfo.tips,
        todayWeather: `今天:${todayInfo.weather}\n温度:${todayInfo.lowest}/${todayInfo.highest}\n${todayInfo.wind} ${todayInfo.windspeed}\n\n`,
      }
      return obj
    } else {
      console.log('获取天气接口失败', content.msg)
    }
  } catch (err) {
    console.log('获取天气接口失败', err)
  }
}
/**
 * 获取每日新闻内容
 * @param {*} id 新闻频道对应的ID
 */
async function getNews(id, num = 10) {
  if(id>1000) {
    return getFireNews(id, num)
  }
  try {
    let option = {
      method: 'GET',
      url: '/allnews/',
      params: { num: num, col: id },
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let newList = content.newslist
      let news = ''
      // let shortUrl = 'https://www.tianapi.com/weixin/news/?col=' + id
      for (let i in newList) {
        let num = parseInt(i) + 1
        news = `${news}\r${num}.${newList[i].title}`
      }
      return `${news}\r`
    } else {
      console.log('获取新闻接口失败', content.msg)
    }
  } catch (error) {
    console.log('获取天行新闻失败', error)
  }
}
/**
 * 获取名人名言
 */
async function getMingYan() {
  try {
    let option = {
      method: 'GET',
      url: '/txapi/mingyan/',
      params: { num: 1 },
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let newList = content.newslist
      let news = `${newList[0].content}\r——————————${newList[0].author}`
      return news
    }  else {
      console.log('获取名人名言接口失败', content.msg)
    }
  } catch (error) {
    console.log('获取天行名人名言失败', error)
  }
}
/**
 * 获取星座运势
 * @param {string} satro 星座
 */
async function getStar(astro) {
  try {
    let option = {
      method: 'GET',
      url: '/txapi/star/',
      params: { astro: astro },
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let newList = content.newslist
      let news = ''
      for (let item of newList) {
        news = `${news}${item.type}:${item.content}\n`
      }
      return news
    } else {
      console.log('获取星座接口失败', content.msg)
    }
  } catch (error) {
    console.log('获取天行星座运势失败', error)
  }
}
/**
 * 获取姓氏起源
 * @param {string} 姓
 */
async function getXing(name) {
  try {
    let option = {
      method: 'GET',
      url: '/txapi/surname/',
      params: { xing: name },
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let newList = content.newslist
      let news = `${newList[0].content}`
      return news
    } else {
      console.log('获取姓氏接口失败', content.msg)
    }
  } catch (error) {
    console.log('获取天行姓氏起源失败', error)
  }
}
/**
 * 获取顺口溜
 */
async function getSkl() {
  try {
    let option = {
      method: 'GET',
      url: '/txapi/skl/',
      params: {},
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let newList = content.newslist
      let news = `${newList[0].content}`
      return news
    }
  } catch (error) {
    console.log('获取天行顺口溜失败', error)
  }
}
/**
 * 获取老黄历
 */
async function getLunar(date) {
  try {
    let option = {
      method: 'GET',
      url: '/txapi/lunar/',
      params: { date: date },
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let item = content.newslist[0]
      let news = `\n阳历：${item.gregoriandate}\n阴历：${item.lunardate}\n节日：${item.lunar_festival}\n适宜：${item.fitness}\n不宜：${item.taboo}\n神位：${item.shenwei}\n胎神：${item.taishen}\n冲煞：${item.chongsha}\n岁煞：${item.suisha}`
      return news
    } else {
      console.log('获取老黄历接口失败', content.msg)
    }
  } catch (error) {
    console.log('获取天行老黄历失败', error)
  }
}
/**
 * 天行神回复
 */
async function getGoldReply() {
  try {
    let option = {
      method: 'GET',
      url: '/txapi/godreply/',
      params: { num: 1 },
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let item = content.newslist[0]
      let news = `标题："${item.title}"\n回复：${item.content}`
      return news
    } else {
      console.log("获取神回复接口失败", content.msg);
    }
  } catch (error) {
    console.log('获取天行神回复失败', error)
  }
}
/**
 * 天行歇后语
 */
async function getXhy() {
  try {
    let option = {
      method: 'GET',
      url: '/txapi/xiehou/',
      params: { num: 1 },
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let item = content.newslist[0]
      let news = `${item.quest}————${item.result}`
      return news
    } else {
      console.log('获取歇后语接口失败', content.msg)
    }
  } catch (error) {
    console.log('获取天行歇后语失败', error)
  }
}
/**
 * 天行绕口令
 */
async function getRkl() {
  try {
    let option = {
      method: 'GET',
      url: '/txapi/rkl/',
      params: { num: 1 },
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let item = content.newslist[0]
      let news = `${item.content}`
      return news
    } else {
      console.log('获取绕口令接口失败', content.msg)
    }
  } catch (error) {
    console.log('获取天行绕口令失败', error)
  }
}
/**
 * 天行短连接
 */
async function getShortUrl(url) {
  try {
    let option = {
      method: 'GET',
      url: '/txapi/turl/',
      params: { url: url },
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let item = content.newslist[0]
      let shorturl = item.shorturl
      return shorturl
    }  else {
      console.log('获取短链接口失败', content.msg)
    }
  } catch (error) {
    console.log('获取天行短连接失败', error)
  }
}
/**
 * 获取自定义头像
 * @param {*} base
 * @param type
 */
async function getAvatar(base, type) {
  try {
    let option = {
      method: 'POST',
      url: '/txapi/imgtx/index',
      params: {
        createid: type || 2,
        img: 'data:image/jpeg;base64,' + base,
      },
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let item = content.newslist[0]
      return item.picurl
    }  else {
      console.log('获取自定义头像接口失败', content.msg)
    }
  } catch (e) {
    console.log('获取自定义头像失败', e)
  }
}
/**
 * 获取表情包
 * @param {*} msg
 */
async function getEmo(msg) {
  console.log('msg', msg)
  try {
    let option = {
      method: 'get',
      url: `${EMOHOST}keyword=${encodeURIComponent(msg)}`,
      contentType: 'application/json;charset=UTF-8',
      params: {},
    }
    let content = await req(option)
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
 * 获取美女图片
 */
async function getMeiNv() {
  try {
    let option = {
      method: 'get',
      url: MEINV,
      contentType: 'application/json;charset=UTF-8',
      params: {},
    }
    let content = await req(option)
    if (content.imgurl) {
      let url = content.imgurl
      return url.includes('.jpg') ? url : 'https://tva2.sinaimg.cn/large/0072Vf1pgy1foxkcsx9rmj31hc0u0h9k.jpg'
    }
  } catch (e) {
    console.log('获取美女图片失败', e)
    return 'https://tva2.sinaimg.cn/large/0072Vf1pgy1foxkcsx9rmj31hc0u0h9k.jpg'
  }
}
/**
 * 获取疫情信息
 * @returns {Promise<string>}
 */
async function getNcov() {
  try {
    let option = {
      method: 'GET',
      url: '/txapi/ncov/index',
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let newList = content.newslist[0].news
      const riskarea = content.newslist[0].riskarea
      const reply = `【疫情新闻暂时下线，目前只返回风险地区】\n\n全国风险地区\n\n【高风险地区】:\n${(riskarea.high && riskarea.high.length && riskarea.high.join('\n')) || '暂无'}\n【中风险地区】:\n${
        (riskarea.mid && riskarea.mid.length && riskarea.mid.join('\n')) || '暂无'
      }\n\n——————————数据来源：天行数据`
      // let news = ''
      // for (let i in newList) {
      //   let num = parseInt(i) + 1
      //   news = `${news}<br>>>${newList[i].pubDateStr}: ${newList[i].title}<br><br>${newList[i].summary}----------------${newList[i].infoSource}<br><br>`
      // }
      return reply
    }  else {
      console.log('获取疫情接口失败', content.msg)
    }
  } catch (e) {
    console.log('获取疫情数据失败', e)
  }
}
/**
 * 天行网络取名
 */
async function getCname() {
  try {
    let option = {
      method: 'GET',
      url: '/txapi/cname/index',
    }
    let content = await txReq(option)
    if (content.code === 200) {
      let item = content.newslist[0]
      let cname = item.name
      return cname
    }  else {
      console.log('获取网络取名接口失败', content.msg)
    }
  } catch (error) {
    console.log('获取天行短连接失败', error)
  }
}
export { getResByTXTL }
export { getResByTX }
export { getResByTL }
export { getTXweather }
export { getRubbishType }
export { getSweetWord }
export { getNews }
export { getMingYan }
export { getStar }
export { getXing }
export { getSkl }
export { getLunar }
export { getGoldReply }
export { getXhy }
export { getRkl }
export { getAvatar }
export { getEmo }
export { getMeiNv }
export { getNcov }
export { getCname }
export default {
  getResByTXTL,
  getResByTX,
  getResByTL,
  getTXweather,
  getRubbishType,
  getSweetWord,
  getNews,
  getMingYan,
  getStar,
  getXing,
  getSkl,
  getLunar,
  getGoldReply,
  getXhy,
  getRkl,
  getAvatar,
  getEmo,
  getMeiNv,
  getNcov,
  getCname,
}
