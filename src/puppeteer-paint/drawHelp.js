/**
 * 生成群合影
 * @param list
 * @param options
 * @returns {Promise<unknown>}
 */
async function generateRoomImg({ list, options }) {
  /**
   *
   * @param {*} t 头像数组
   * @param {*} param1
   */
  const __beforePatternCircle = function (t, { size = 120, space = 24, circleSpace = 24, centerSizeMargin = 0 }) {
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
  const patternCircle = function (mc, t, info, i) {
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
  const drawTitle = function (mc, title, titleInfo) {
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
  /**
   * 头像处理
   * @param {*}} list
   * @param {*} size
   */
  const cropImg = async function (list, size = 74, MImage) {
    try {
      const arr = []
      if (list.length >= 100) {
        console.log('群成员数量超过100，生成群合影速度可能比较慢，请耐心等待')
      }
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
  return new Promise(async (resolve, reject) => {
    let MCanvas = window.MCanvas.MCanvas
    let MImage = window.MCanvas.MImage
    try {
      const { sizeInfo, titleInfo, background, roomName } = options
      list = await cropImg(list, sizeInfo.size, MImage)
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
      resolve(base64)
    } catch (e) {
      console.log('群合影生成失败', e)
      reject(`群合影生成失败:${e}`)
    }
  })
}
async function generateAvatar({ avatar, coverImg }) {
  coverImg = coverImg || 'http://image.xkboke.com/hat.png'
  return new Promise(async (resolve, reject) => {
    try {
      let MCanvas = window.MCanvas.MCanvas
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
      resolve(base64)
    } catch (e) {
      console.log('头像生成失败', e)
      reject(`头像生成失败:${e}`)
    }
  })
}
export { generateAvatar }
export { generateRoomImg }
export default {
  generateAvatar,
  generateRoomImg,
}
