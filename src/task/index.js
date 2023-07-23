import { setLocalSchedule, delay, cancelAllSchedule } from "../lib/index.js";
import { allConfig } from "../db/configDb.js";
import { getScheduleList, updateSchedule } from "../proxy/aibotk.js";
import {
  getNewsContent,
  getEveryDayContent,
  roomSay,
  getRoomEveryDayContent,
  contactSay,
  getCountDownContent
} from "../common/index.js";

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
    let time = item.date;
    item.type = item.type ? item.type : "contact";
    const target = await findTarget({ that, type: item.type, name: item.roomName || item.name, alias: item.alias || '', wxid: item.wxid || '' });
    if (!target) {
      console.log(`查找不到${typeMap[item.type]}：${item.roomName || item.name}`);
    } else {
      console.log(`${typeMap[item.type]}：“${item.roomName||item.name}”设置定时任务成功`);
      setLocalSchedule(
        time,
        callback.bind(null, { that, target, item }),
        name
      );
    }
  } catch (error) {
    console.log("设置自定义定时任务失败：", error);
  }
}

/**
 * 发送自定义内容
 * @param that
 * @param target
 * @param item
 * @return {Promise<void>}
 */
const sendCustom = async ({ that, target, item }) => {
  for (let reply of item.contents) {
    console.log("定时任务开始发送，内容：", `${reply.type === 1 ? reply.content : reply.url}`);
    await delay(1000);
    if (item.type === "room") {
      await roomSay.call(that, target, "", reply);
    } else {
      await contactSay.call(that, target, reply);
    }
  }
}

/**
 * 发送新闻资讯
 * @param that
 * @param target
 * @param item
 * @return {Promise<void>}
 */
const sendNews = async ({ that, target, item }) => {
  let content = await getNewsContent(item.sortId, item.endWord, item.num || 10);
  console.log("新闻资讯开始发送，内容：", content);
  await delay(3000);
  await target.say(content);
}


/**
 * 发送每日说
 * @param that
 * @param target
 * @param item
 * @return {Promise<void>}
 */
const sendEveryDay = async ({ that, target, item }) => {
  let content = "";
  if (item.type === "room") {
    content = await getRoomEveryDayContent(item.memorialDay, item.city, item.endWord);
  } else {
    content = await getEveryDayContent(item.memorialDay, item.city, item.endWord);
  }
  console.log("每日说任务开始工作,发送内容：", content);
  await delay(3000);
  await target.say(content);
}

/**
 * 发送倒计时
 * @param that
 * @param target
 * @param item
 * @return {Promise<void>}
 */
const sendCountDown = async ({ that, target, item }) => {
  let content = await getCountDownContent(item.memorialDay, item.prefix, item.suffix, item.endWord);
  console.log("倒计时任务开始工作,发送内容：", content);
  await delay(3000);
  await target.say(content);
}

/**
 * 立即发送群消息
 * @param {*} that bot对象
 * @param {*} item 任务项  { target: 'Room', event: '', message: { roomName: '', type: 'news 新闻 ||task 定时任务', contents: [] } }
 */
async function sendTaskMessage(that, info) {
  try {
    const item = info.message;
    item.type = item.type ? item.type : "room";
    const target = await findTarget({ that, type: item.type, name: item.roomName || item.name, alias: item.alias || '', wxid: item.wxid || '' });
    if (!target) {
      console.log(`查找不到${typeMap[item.type]}：${item.roomName||item.name}`);
    } else {
      if (info.event === "roomNews" || info.event === "news") {
        await sendNews({ that, target, item })
      } else if (info.event === "roomTask" || info.event === "custom") {
        await sendCustom({ that, target, item })
      } else if(info.event === "wechatEveryday") {
        await sendEveryDay({ that, target, item })
      } else if(info.event === "countdown") {
        await sendCountDown({ that, target, item })
      }
    }
  } catch (error) {
    console.log("发送定时任务失败：", error);
  }
}

/**
 * 设置定时任务
 * @param {*} that bot 对象
 * @param {*} item 定时任务项
 */
async function setScheduleTask(that, item, name) {
  try {
    let time = item.isLoop ? item.time : new Date(item.time);
    setLocalSchedule(
      time,
      async () => {
        try {
          let contact = await that.Contact.find({ name: item.subscribe });
          if (contact) {
            console.log(`${item.subscribe}的专属提醒开启啦！`);
            await contact.say(item.content);
          } else {
            console.log(`没有找到联系人：${item.subscribe}`);
          }
          if (!item.isLoop) {
            await updateSchedule(item.id);
          }
        } catch (error) {
          console.log("设置定时任务错误", error);
        }
      },
      name
    );
  } catch (e) {
    console.log("setScheduleTask error", e);
  }
}

/**
 * 初始化提醒任务
 * @param {}} that
 */
async function initTimeSchedule(that) {
  try {
    cancelAllSchedule("time_tips");
    let scheduleList = await getScheduleList(); // 获取定时任务
    if (scheduleList && scheduleList.length > 0) {
      for (let item of scheduleList) {
        void setScheduleTask(that, item, `time_tips_${item.id}`);
      }
    }
  } catch (e) {
    console.log("initTimeSchedule error", e);
  }
}

/**
 * 初始化定时任务
 * @param {}} that
 */
async function initTaskLocalSchedule(that) {
  try {
    cancelAllSchedule("task");
    const config = await allConfig(); // 获取配置信息
    const { dayTaskSchedule, roomNewsSchedule, roomTaskSchedule, countDownTaskSchedule } = config;
    // 每日说定时任务
    if (dayTaskSchedule && dayTaskSchedule.length > 0) {
      dayTaskSchedule.forEach((item, index) => {
        setTask(that, { type: 'contact', ...item }, `task_day_${index}`, sendEveryDay);
      });
    }
    // 新闻资讯定时任务
    if (roomNewsSchedule && roomNewsSchedule.length > 0) {
      roomNewsSchedule.forEach((item, index) => {
        setTask(that, { type: 'room', ...item }, `task_news_${index}`, sendNews);
      });
    }
    // 自定义内容定时任务
    if (roomTaskSchedule && roomTaskSchedule.length > 0) {
      roomTaskSchedule.forEach((item, index) => {
        setTask(that, { type: 'room', ...item }, `task_custom_${index}`, sendCustom);
      });
    }
    // 倒计时定时任务
    if (countDownTaskSchedule && countDownTaskSchedule.length > 0) {
      countDownTaskSchedule.forEach((item, index) => {
        setTask(that, item, `task_countdown_${index}`, sendCountDown);
      });
    }
  } catch (e) {
    console.log("initTaskLocalSchedule error", e);
  }
}


/**
 * 初始化小助手任务
 * @param {*} that bot对象
 * @param {*} scheduleList 提醒任务列表
 * @param {*} daySayList 每日说任务列表
 * @param {*} RoomSayList 群资讯任务列表
 */
async function initAllSchedule(that) {
  await initTimeSchedule(that);
  await initTaskLocalSchedule(that);
}

export { initTaskLocalSchedule };
export { initAllSchedule };
export { initTimeSchedule };
export { sendTaskMessage };
export default {
  initTaskLocalSchedule,
  initAllSchedule,
  initTimeSchedule,
};
