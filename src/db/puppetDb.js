import nedb from './nedb.js'
const pdb = nedb()

/**
 *
 * @param info {{puppetType}}
 * @return {Promise<unknown>}
 */
export async function addPuppetInfo(info) {
  try {
    let doc = await pdb.insert(info)
    return doc
  } catch (error) {
    console.log('插入数据错误', error)
  }
}

/**
 * 更新配置文件
 * @param {*} config
 */
export async function updatePuppetConfig(config) {
  try {
    let res = await allPuppetConfig()
    if (res) {
      let up = await pdb.update({ id: config.id }, config)
      return up
    } else {
      let add = await addPuppetInfo(config)
      return add
    }
  } catch (error) {
    console.log('puppet更新失败', error)
  }
}

/**
 * 获取所有配置
 */
export async function allPuppetConfig() {
  try {
    let search = await pdb.find()
    return search[0]
  } catch (error) {
    console.log('查询数据错误', error)
  }
}
export async function getPuppetInfo() {
  try {
    let search = await pdb.find({})
    return search[0]
  } catch (error) {
    console.log('查询数据错误', error)
  }
}