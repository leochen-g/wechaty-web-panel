const Crypto = require('crypto')
const schedule = require('node-schedule')
const fs = require('fs')
const { MCanvas, MImage } = require('mcanvas')
const { addRoom, getRoom } = require('../common/roomAvatarDb')

/**
 * 设置定时器
 * @param {*} date 日期
 * @param {*} callback 回调
 */
//其他规则见 https://www.npmjs.com/package/node-schedule
// 规则参数讲解    *代表通配符
//
// *  *  *  *  *  *
// ┬ ┬ ┬ ┬ ┬ ┬
// │ │ │ │ │ |
// │ │ │ │ │ └ day of week (0 - 7) (0 or 7 is Sun)
// │ │ │ │ └───── month (1 - 12)
// │ │ │ └────────── day of month (1 - 31)
// │ │ └─────────────── hour (0 - 23)
// │ └──────────────────── minute (0 - 59)
// └───────────────────────── second (0 - 59, OPTIONAL)

// 每分钟的第30秒触发： '30 * * * * *'
//
// 每小时的1分30秒触发 ：'30 1 * * * *'
//
// 每天的凌晨1点1分30秒触发 ：'30 1 1 * * *'
//
// 每月的1日1点1分30秒触发 ：'30 1 1 1 * *'
//
// 每周1的1点1分30秒触发 ：'30 1 1 * * 1'

function setLocalSchedule(date, callback, name) {
  if (name) {
    schedule.scheduleJob(name, { rule: date, tz: 'Asia/Shanghai' }, callback)
  } else {
    schedule.scheduleJob({ rule: date, tz: 'Asia/Shanghai' }, callback)
  }
}

// 取消任务
function cancelLocalSchedule(name) {
  schedule.cancelJob(name)
}

// 取消指定任务
function cancelAllSchedule(type) {
  for (let i in schedule.scheduledJobs) {
    if (i.includes(type)) {
      cancelLocalSchedule(i)
    }
  }
}

/**
 * 获取所有定时任务的job名
 *
 */
function getAllSchedule() {
  for (let i in schedule.scheduledJobs) {
    console.log(i)
  }
}

/**
 * 延时函数
 * @param {*} ms 毫秒
 */
async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 读取文件
 */
const loadFile = {
  data: null,
  mtime: '',
  fetch(file) {
    try {
      let mtime = fs.statSync(file).mtime
      if (!this.data || mtime - this.mtime !== 0) {
        console.log('Reload task file: ' + mtime)
        this.data = JSON.parse(fs.readFileSync(file))
        this.mtime = +mtime
      }
    } catch (e) {
      console.log(e)
    }
    return this.data
  },
}

/**
 * 获取周几
 * @param {*} date 日期
 */
function getDay(date) {
  var date2 = new Date()
  var date1 = new Date(date)
  var iDays = parseInt(Math.abs(date2.getTime() - date1.getTime()) / 1000 / 60 / 60 / 24)
  return iDays
}

/**
 * 格式化日期
 * @param {*} date
 * @returns 例：2019-9-10 13:13:04 星期一
 */
function formatDate(date) {
  var tempDate = new Date(date)
  var year = tempDate.getFullYear()
  var month = tempDate.getMonth() + 1
  var day = tempDate.getDate()
  var hour = tempDate.getHours()
  var min = tempDate.getMinutes()
  var second = tempDate.getSeconds()
  var week = tempDate.getDay()
  var str = ''
  if (week === 0) {
    str = '星期日'
  } else if (week === 1) {
    str = '星期一'
  } else if (week === 2) {
    str = '星期二'
  } else if (week === 3) {
    str = '星期三'
  } else if (week === 4) {
    str = '星期四'
  } else if (week === 5) {
    str = '星期五'
  } else if (week === 6) {
    str = '星期六'
  }
  if (hour < 10) {
    hour = '0' + hour
  }
  if (min < 10) {
    min = '0' + min
  }
  if (second < 10) {
    second = '0' + second
  }
  return year + '-' + month + '-' + day + ' ' + hour + ':' + min + ' ' + str
}

/**
 * 获取今天日期
 * @returns 2019-7-19
 */
function getToday() {
  const date = new Date()
  let year = date.getFullYear()
  let month = date.getMonth() + 1
  let day = date.getDate()
  return year + '-' + month + '-' + day + ' '
}

/**
 * 转换定时日期格式
 * @param {*} time
 * @returns 0 12 15 * * * 每天下午3点12分
 */
function convertTime(time) {
  let array = time.split(':')
  return '0 ' + array[1] + ' ' + array[0] + ' * * *'
}

//
/**
 * 判断日期时间格式是否正确
 * @param {*} str 日期
 * @returns {boolean}
 */
function isRealDate(str) {
  var reg = /^(\d+)-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2})$/
  var r = str.match(reg)
  if (r == null) return false
  r[2] = r[2] - 1
  var d = new Date(r[1], r[2], r[3], r[4], r[5])
  if (d.getFullYear() != r[1]) return false
  if (d.getMonth() != r[2]) return false
  if (d.getDate() != r[3]) return false
  if (d.getHours() != r[4]) return false
  if (d.getMinutes() != r[5]) return false
  return true
}

/**
 * 获取星座的英文
 * @param {*} msg
 */
function getConstellation(astro) {
  if (astro.includes('白羊座')) {
    return 'aries'
  }
  if (astro.includes('金牛座')) {
    return 'taurus'
  }
  if (astro.includes('双子座')) {
    return 'gemini'
  }
  if (astro.includes('巨蟹座') || astro.includes('钜蟹座')) {
    return 'cancer'
  }
  if (astro.includes('狮子座')) {
    return 'leo'
  }
  if (astro.includes('处女座')) {
    return 'virgo'
  }
  if (astro.includes('天平座') || astro.includes('天秤座') || astro.includes('天瓶座') || astro.includes('天枰座')) {
    return 'libra'
  }
  if (astro.includes('天蝎座')) {
    return 'scorpio'
  }
  if (astro.includes('射手座')) {
    return 'sagittarius'
  }
  if (astro.includes('射手座')) {
    return 'sagittarius'
  }
  if (astro.includes('摩羯座')) {
    return 'capricorn'
  }
  if (astro.includes('水瓶座')) {
    return 'aquarius'
  }
  if (astro.includes('双鱼座')) {
    return 'pisces'
  }
}

/**
 * 返回指定范围的随机整数
 * @param {*} min
 * @param {*} max
 */
function randomRange(min, max) {
  // min最小值，max最大值
  return Math.floor(Math.random() * (max - min)) + min
}

/**
 * 写入文件内容
 * @param fpath
 * @param encoding
 * @returns {Promise<unknown>}
 */
async function writeFile(fpath, encoding) {
  return new Promise(function (resolve, reject) {
    fs.writeFile(fpath, encoding, function (err, content) {
      if (err) {
        reject(err)
      } else {
        resolve(content)
      }
    })
  })
}

/**
 * 解析响应数据
 * @param {*} content 内容
 */
function parseBody(content) {
  if (!content) return
  return JSON.parse(content.text)
}

/**
 * MD5加密
 * @return {string}
 */
function MD5(str) {
  return Crypto.createHash('md5').update(str).digest('hex')
}

/**
 * 对象内容按照字母排序
 * @param obj
 */
function objKeySort(obj) {
  const newkey = Object.keys(obj).sort()
  const newObj = {}
  for (let i = 0; i < newkey.length; i++) {
    newObj[newkey[i]] = obj[newkey[i]]
  }
  return newObj
}

/**
 * 根据排序后的数据返回url参数
 * @param datas
 * @returns {string}
 */
function getQueryString(datas) {
  const data = objKeySort(datas)
  let url = ''
  if (typeof data === 'undefined' || data == null || typeof data !== 'object') {
    return ''
  }
  for (var k in data) {
    const string = typeof data[k] === 'object' ? JSON.stringify(data[k]) : data[k]
    url += (url.indexOf('=') !== -1 ? '&' : '') + k + '=' + string
  }
  return url
}

/**
 * 获取MD5加密后的Sign
 * @param secret
 * @param query
 * @returns {string}
 */
function getSign(secret, query) {
  const stringSignTemp = `${query}&ApiSecret=${secret}`
  return MD5(stringSignTemp).toUpperCase()
}

/**
 * 生成n位随机数
 * @param n
 * @returns {string}
 */
function rndNum(n) {
  let rnd = ''
  for (let i = 0; i < n; i++) {
    rnd += Math.floor(Math.random() * 10)
  }
  return rnd
}

/**
 * 生成加密后的对象
 * @param apiKey
 * @param apiSecret
 * @param params
 * @returns {{apiKey: *, nonce: *, timestamp: *}}
 */
function getFormatQuery(apiKey, apiSecret, params = {}) {
  const query = {
    apiKey: apiKey,
    timestamp: new Date().getTime(),
    nonce: rndNum(3),
    ...params,
  }
  const sign = getSign(getQueryString(query), apiSecret)
  query.sign = sign
  return query
}

/**
 * 生成回复内容
 * @param type 内容类型
 * @param content 内容
 * @param url 链接
 * @returns {[{type: *, content: *, url: *}]}
 */
function msgArr(type = 1, content = '', url = '') {
  let obj = { type: type, content: content, url: url }
  return [obj]
}

/**
 * 设置提醒内容解析
 * @param {*} keywordArray 分词后内容
 * @param name
 */
function contentDistinguish(keywordArray, name) {
  let scheduleObj = {}
  let today = getToday()
  scheduleObj.setter = name // 设置定时任务的用户
  scheduleObj.subscribe = keywordArray[1] === '我' ? name : keywordArray[1] // 定时任务接收者
  if (keywordArray[2] === '每天') {
    // 判断是否属于循环任务
    console.log('已设置每日定时任务')
    scheduleObj.isLoop = true
    if (keywordArray[3].includes(':') || keywordArray[3].includes('：')) {
      let time = keywordArray[3].replace('：', ':')
      scheduleObj.time = convertTime(time)
    } else {
      scheduleObj.time = ''
    }
    scheduleObj.content = scheduleObj.setter === scheduleObj.subscribe ? `亲爱的${scheduleObj.subscribe}，温馨提醒：${keywordArray[4].replace('我', '你')}` : `亲爱的${scheduleObj.subscribe},${scheduleObj.setter}委托我提醒你，${keywordArray[4].replace('我', '你')}`
  } else if (keywordArray[2] && keywordArray[2].includes('-')) {
    console.log('已设置指定日期时间任务')
    scheduleObj.isLoop = false
    scheduleObj.time = keywordArray[2] + ' ' + keywordArray[3].replace('：', ':')
    scheduleObj.content = scheduleObj.setter === scheduleObj.subscribe ? `亲爱的${scheduleObj.subscribe}，温馨提醒：${keywordArray[4].replace('我', '你')}` : `亲爱的${scheduleObj.subscribe},${scheduleObj.setter}委托我提醒你，${keywordArray[4].replace('我', '你')}`
  } else {
    console.log('已设置当天任务')
    scheduleObj.isLoop = false
    scheduleObj.time = today + keywordArray[2].replace('：', ':')
    scheduleObj.content = scheduleObj.setter === scheduleObj.subscribe ? `亲爱的${scheduleObj.subscribe}，温馨提醒：${keywordArray[3].replace('我', '你')}` : `亲爱的${scheduleObj.subscribe},${scheduleObj.setter}委托我提醒你，${keywordArray[3].replace('我', '你')}`
  }
  return scheduleObj
}

//过滤联系人
/**
 * @param {*} param1
 * name：名字
 * alias：别名
 * friend : 1是朋友 2不是朋友
 * type : 1个人   2 公众号  3 未知
 * gender : 1 男  2  女
 * province : 省份
 * city ：城市
 * address：地址
 */
function filterContacts(contacts, query) {
  let { name, alias, friend, type, gender, province, city, address } = query
  return contacts.filter((item) => {
    let arr = []
    let { payload } = item
    if (friend) {
      let bool = Number(friend) === 1 ? true : false
      arr.push(bool === payload.friend)
    }
    name && arr.push(payload.name.indexOf(name) >= 0)
    alias && arr.push(payload.alias.indexOf(alias) >= 0)
    type && arr.push(Number(type) === payload.type)
    gender && arr.push(Number(gender) === payload.gender)
    province && arr.push(payload.province.indexOf(province) >= 0)
    city && arr.push(payload.city.indexOf(city) >= 0)
    address && arr.push(payload.address.indexOf(address) >= 0)
    return arr.indexOf(false) < 0
  })
}

/**
 * 格式化联系人
 * @param {*} data
 */
function formatContacts(data) {
  let arr = data.map(function (item) {
    // const file = await item.avatar()
    // let avatar = await file.toBase64(file.name, true);
    let payload = item.payload
    return {
      id: payload.id,
      name: payload.name,
      gender: payload.gender === 0 ? '无' : payload.gender === 1 ? '男' : '女',
      alias: payload.alias,
      friend: payload.friend ? '是' : '否',
      star: payload.star ? '是' : '否',
      type: payload.type === 1 ? '个人' : payload.type === 2 ? '公众号' : '未知',
      signature: payload.signature,
      province: payload.province,
      city: payload.city,
      address: payload.address,
    }
  })
  return arr
}

/**
 * 函数节流
 * @param fn
 * @param wait
 * @returns {Function}
 */
function throttle(fn, wait) {
  var timer = null
  return function () {
    var context = this
    var args = arguments
    if (!timer) {
      timer = setTimeout(function () {
        fn.apply(context, args)
        timer = null
      }, wait)
    }
  }
}

/**
 * @return {string}
 */
function Base64Encode(str) {
  return Buffer.from(str).toString('base64')
}

/**
 * @return {string}
 */
function Base64Decode(str) {
  return Buffer.from(str, 'base64').toString('ascii')
}

/**
 * 数组拆分
 * @param {array} array 数组
 * @param {*} subGroupLength 每个数组长度
 */
function groupArray(array, subGroupLength) {
  let index = 0
  let newArray = []
  while (index < array.length) {
    newArray.push(array.slice(index, (index += subGroupLength)))
  }
  return newArray
}

/**
 * 获取群用户列表
 * @param {*}} room
 * @param {*} name
 */
async function getRoomAvatarList(room, name) {
  try {
    const members = await room.memberAll()
    let res = []
    console.log('正在努力获取群成员信息...')
    for (let i of members) {
      let member = i.payload
      try {
        const avatar = await i.avatar()
        if (avatar.mimeType && member.name) {
          const base64 = member.weixin ? member.avatar : await avatar.toDataURL()
          let obj = {
            img: base64,
            name: member.name,
          }
          res.push(obj)
        }
      } catch (error) {
        console.log(`获取${member.name}头像失败， 头像文件格式错误，不影响群合影生成`)
        continue
      }
    }
    const say = res.splice(
      res.findIndex((e) => e.name === name),
      1
    )
    res.unshift(say[0])
    console.log('获取群成员信息完成...')
    return res
  } catch (e) {
    console.log('getRoomAvatarList error', e)
  }
}

/**
 * 设置中心位置
 */
function setFirstAvatr(list, name) {
  const temp = list
  const say = temp.splice(
    temp.findIndex((e) => e.name === name),
    1
  )
  temp.unshift(say[0])
  return temp
}

/**
 * 获取群头像列表
 * @param {*} roomObj
 * @param {*} roomName
 * @param {*} name
 */
async function getRoomAvatar(roomObj, roomName, name) {
  try {
    let memberList = []
    const room = await getRoom(roomName) // 先获取缓存中是否存在已经获取的头像
    if (room && room.list) {
      memberList = room.list
    } else {
      const list = await getRoomAvatarList(roomObj, name)
      const obj = { name: roomName, list }
      await addRoom(obj)
      memberList = list
    }
    console.log('准备绘制...')
    const list = setFirstAvatr(memberList, name)
    return list
  } catch (e) {
    console.log('getRoomAvatar error', e)
  }
}

/**
 * 头像处理
 * @param {*}} list
 * @param {*} size
 */
async function cropImg(list, size = 74) {
  try {
    const arr = []
    for (const i of list) {
      try {
        if (i.img) {
          const im = new MImage(i.img)
          im.compress({
            quality: 1,
            width: size,
            height: size,
          }).crop({
            radius: size,
          })
          const bas64 = await im.draw({ type: 'png' })
          arr.push({ img: bas64 })
        }
      } catch (error) {
        console.log('处理头像失败', error)
        continue
      }
    }
    return arr
  } catch (error) {
    console.log('cropImg error', error)
  }
}

/**
 *
 * @param {*} t 头像数组
 * @param {*} param1
 */
function __beforePatternCircle(t, { size = 120, space = 24, circleSpace = 24, centerSizeMargin = 0 }) {
  let i, r, n, s, o, c, l, p, u, g, m, d, h, f, v, b, w, y, C, _, k, I, x, S, j, q, D, z, P
  for (u in ((i = size), (r = space), (n = circleSpace), (s = centerSizeMargin), (o = 1), (c = 0), (l = []), (p = r), t)) {
    if (u > 0 && ((g = i / 2), (m = (i + n) * o), (m += s), (d = (2 * Math.PI * m) / (2 * g + r)), (d = Math.floor(d)), u > 0 && c === d - 1 ? (o++, (c = 0), l.push(d)) : c++, (h = t.length - 1 + ''), u === h && ((f = c), (v = c * i), c < d))) {
      for (C in ((b = 0), (w = 0), (y = []), l)) {
        C < l.length &&
          ((_ = l[C] * r),
          _ >= i + r &&
            ((b += _),
            (w += l[C]),
            y.push({
              level: C,
              spaceUnit: _,
            })))
      }
      v <= b && ((k = w + f === 0 ? 0 : (b - v) / (w + f)), (p = k))
    }
  }
  for (j in ((I = 1), (x = 0), (S = 0), t)) j > 0 && ((q = i / 2), (D = (i + n) * I), (D += s), (z = (2 * Math.PI * D) / (2 * q + p)), (z = Math.floor(z)), t.length - j < z && ((P = t.length - 1 + ''), j === P && (S = 360 / (x + 1))), j > 0 && x === z - 1 ? (I++, (x = 0)) : x++)
  return {
    newSpace: p,
    newRate: S,
    lastCircleNumber: I,
  }
}

function patternCircle(mc, t, info, i) {
  let r, n, s, g, d, h, f, v, b, w, y, C, _, k, I, x, S, j, q
  r = i.x
  n = i.y
  const o = i.centerSize || i.size
  s = i.space
  const c = o > i.size ? (o - i.size) / 2 : 0
  const l = i.backWid
  const p = i.backHei
  const u = l / 2 // x中间坐标
  g = p / 2 // y中间坐标
  g = i.marginBottom ? p - i.marginBottom : g
  r = u - i.size / 2
  n = g - i.size / 2
  const m = s
  for (w in ((d = info), (s = d.newSpace), (h = d.newRate), (f = d.lastCircleNumber), (v = 1), (b = 0), t)) {
    w > 0 &&
      ((y = i.size / 2),
      (C = (i.size + m) * v),
      (C += c),
      (_ = (2 * Math.PI * C) / (2 * y + s)),
      (_ = Math.floor(_)),
      (k = 360 / _),
      f === v && (k = h),
      (I = ((2 * Math.PI) / 360) * k * b),
      (x = u + Math.sin(I + (2 * Math.PI * 270) / 360) * C),
      (S = g - Math.cos(I + (2 * Math.PI * 270) / 360) * C),
      (r = x - y),
      (n = S - y),
      w > 0 && b === _ - 1 ? (v++, (b = 0)) : b++),
      (j = i.size),
      parseInt(w) === 0 && ((j = o), (r = u - o / 2), (n = g - o / 2)),
      (q = t[w].img)
    mc.add(q, {
      width: j,
      pos: {
        x: r,
        y: n,
        scale: 1,
      },
    })
  }
  return mc
}

/**
 * 绘制标题
 * @param {*} mc
 * @param {*} title
 * @param {*} titleInfo
 */

function drawTitle(mc, title, titleInfo) {
  mc.text(title, {
    align: 'center',
    width: '100%',
    normalStyle: {
      color: titleInfo.color,
      lineHeight: titleInfo.fontSize,
      font: `${titleInfo.fontSize}px Microsoft YaHei,sans-serif`,
    },
    pos: {
      x: 0,
      y: titleInfo.top,
    },
  })
}

async function generateRoomImg(list, options) {
  try {
    const { sizeInfo, titleInfo, background, roomName } = options
    console.log('群合影生成中...')
    list = await cropImg(list, sizeInfo.size)
    const initOptions = {
      title: titleInfo.title || roomName,
      centerSize: sizeInfo.centerSize,
      space: sizeInfo.space,
      circleSpace: sizeInfo.space,
      size: sizeInfo.size,
      x: 0,
      y: 0,
      backWid: sizeInfo.width,
      backHei: sizeInfo.height,
      marginBottom: sizeInfo.bottom, // 距离底部高度
    }
    const mc = new MCanvas({
      width: initOptions.backWid,
      height: initOptions.backHei,
      backgroundColor: '#ffffff',
    })
    mc.background(background, {
      type: 'contain',
    })
    const info = __beforePatternCircle(list, initOptions)
    patternCircle(mc, list, info, initOptions)
    drawTitle(mc, initOptions.title, titleInfo)
    const base64 = await mc.draw({ type: 'jpg', quality: 1 })
    console.log('群合影生成成功！')
    // var base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
    // var dataBuffer = Buffer.from(base64Data, 'base64')
    // fs.writeFile('image.jpg', dataBuffer, function (err) {
    //   if (err) {
    //     console.log(err)
    //   } else {
    //     console.log('保存成功！')
    //   }
    // })
    return base64
  } catch (e) {
    console.log('群合影生成失败', e)
  }
}

async function generateAvatar(avatar, coverImg = 'http://image.xkboke.com/hat.png') {
  try {
    let mc = new MCanvas({
      width: 880,
      height: 880,
      backgroundColor: '#ffffff',
    })
    mc.add(avatar, {
      width: 860,
      pos: {
        x: 10,
        y: 10,
        scale: 1,
      },
    })
    mc.add(coverImg, {
      width: 880,
      pos: {
        x: 0,
        y: 0,
        scale: 1,
      },
    })
    const base64 = await mc.draw({ type: 'jpg', quality: 1 })
    // var base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
    // var dataBuffer = Buffer.from(base64Data, 'base64')
    // fs.writeFile('avatar.jpg', dataBuffer, function (err) {
    //   if (err) {
    //     console.log(err)
    //   } else {
    //     console.log('保存成功！')
    //   }
    // })
    return base64
  } catch (e) {
    console.log('头像生成失败', e)
  }
}

module.exports = {
  Base64Encode,
  Base64Decode,
  setLocalSchedule,
  parseBody,
  delay,
  getToday,
  convertTime,
  getDay,
  formatDate,
  isRealDate,
  getConstellation,
  randomRange,
  writeFile,
  MD5,
  getFormatQuery,
  contentDistinguish,
  msgArr,
  throttle,
  formatContacts,
  filterContacts,
  cancelAllSchedule,
  getAllSchedule,
  groupArray,
  getRoomAvatarList,
  generateRoomImg,
  getRoomAvatar,
  generateAvatar,
}
