import { setLocalSchedule, delay, cancelAllSchedule, delHtmlTag } from "../lib/index.js";
import { getAllRssConfig } from '../db/rssConfig.js'
import { addRssHistory, updateRssHistory, getRssHistoryById } from "../db/rssHistory.js";
import { roomSay, contactSay } from "../common/index.js";
import rssParser from 'rss-parser';
import { getPuppetEol } from "../const/puppet-type.js";
import dayjs from "dayjs";
import { getRssLast, updateRssLast } from '../proxy/aibotk.js'

async function getRssContent(info) {
  try {
    const parser = new rssParser({
      requestOptions: {
        rejectUnauthorized: false,
      },
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
    });
    console.log('订阅源:' + info.rssUrl);
    const feed = await parser.parseURL(info.rssUrl);
    const lastItem = await getRssLast(info.id);
    console.log('上一条已经推送的消息', JSON.stringify(lastItem))
    // 当存在文章的时候
    if(feed.items && feed.items.length) {
      // 当存在历史推送记录 需要判读是否推送过
      const last = feed.items[0];
      const lastContent = last.link || last.title;
      if(lastItem) {
        if(lastContent !== lastItem?.lastContent) {
          const content = await setContent(last, info);
          void updateRssLast(info.id, lastContent)
          return content;
        }
        console.log('rss内容未更新,最后一条内容已推送');
        return [];
      } else {
        const content = await setContent(last, info);
        void updateRssLast(info.id, lastContent)
        return content;
      }
    }
  } catch (e) {
    console.log("获取rss内容失败，大概率是订阅源格式不规范，请更换:" + e);
    return [];
  }
}


async function setContent(feed, info) {
  try {
    const eol = await getPuppetEol();
    if(info.showLink) {
      const res = { type: 4, url: feed.link, title: delHtmlTag(feed.title), description: delHtmlTag(feed.content).substring(0,80), thumbUrl: info.thumbUrl };
      return [res];
    } else {
      const desc = delHtmlTag(feed.content)?.substring(0,1500)?.trim()
      const content = `${info.prefixWord ? info.prefixWord + eol + eol: ''}${delHtmlTag(feed.title)}${eol}${eol} ${desc ? `【摘要】：${desc}...${eol}` : ''}【链接】:${feed.link}${eol}${eol}${info.suffixWord || ''}`;
      return [{ type: 1, content: content }]
    }
  } catch (e) {
    console.log('设置rss发送内容报错：', e)
    return [{ type: 1, content: '' }]
  }

}


const typeMap = {
  contact: "用户名",
  room: "群名"
};

/**
 * 查找发送的目标
 * type: contact  room
 * name: 目标名称
 * alias: 别名
 * wxid: wxid
 */
async function findTarget({ that, type, name, alias, wxid = '' }) {
  let target = null;
  if (type === "contact") {
    target = wxid && that.Contact.find({id: wxid }) || name && (await that.Contact.find({ name: name })) || alias && (await that.Contact.find({ alias: alias })); // 获取你要发送的联系人
  } else {
    target = wxid && that.Room.find({id: wxid }) || name && (await that.Room.find({ topic: name })); // 获取你要发送的群组
  }
  return target;
}

/**
 * 设置定时任务
 * @param that
 * @param item
 * @param name
 * @param callback
 * @return {Promise<void>}
 */
async function setTask(that, item, name, callback) {
  try {
    let time = item.updateTime;
    for(let user of item.targets) {
      const target = await findTarget({ that, type: item.type, name: user.name,  wxid: user.id || '' });
      if (!target) {
        console.log(`查找不到${typeMap[item.type]}：${user.name}`);
      } else {
        console.log(`${typeMap[item.type]}：“${user.name}”设置rss定时任务成功`);
        setLocalSchedule(
          time,
          callback.bind(null, { that, target, item }),
          name
        );
      }
    }
  } catch (error) {
    console.log("设置自定义定时任务失败：", error);
  }
}

/**
 * 发送rss 更新订阅内容
 * @param that
 * @param target
 * @param item
 * @return {Promise<void>}
 */
async function sendRssContent ({ that, target, item }) {
  const replys = await getRssContent(item);
  for (let reply of replys) {
    console.log("检测到rss内容更新，开始发送：", `${reply.type === 1 ? reply.content : reply.url}`);
    await delay(1000);
    if (item.type === "room") {
      await roomSay.call(that, target, "", reply);
    } else {
      await contactSay.call(that, target, reply);
    }
  }
}

/**
 * 立即发送rss消息
 * @param {*} that bot对象
 * @param {*} item 任务项  { target: 'Room', event: '', message: { roomName: '', type: 'news 新闻 ||task 定时任务', contents: [] } }
 */
export async function sendRssTaskMessage(that, info) {
  try {
    const item = info.message;
    for(let user of item.targets) {
      const target = await findTarget({ that, type: item.type, name: user.name || '', wxid: user.id || '' });
      if (!target) {
        console.log(`查找不到${typeMap[item.type]}：${user.name}`);
      } else {
        await sendRssContent({ that, target, item })
      }
    }
  } catch (error) {
    console.log("发送rss任务失败：", error);
  }
}


/**
 * 初始化rss定时任务
 * @param {}} that
 */
export async function initRssTask(that) {
  try {
    cancelAllSchedule("rss_");
    const rssTasks = await getAllRssConfig(); // 获取配置信息
    console.log(`获取到 rss 任务 :${rssTasks.length}个`)
    // 每日说定时任务
    if (rssTasks && rssTasks.length > 0) {
      rssTasks.forEach((item, index) => {
        setTask(that, item, `rss_${index}`, sendRssContent);
      });
    }
  } catch (e) {
    console.log("初始化rss订阅任务", e);
  }
}
