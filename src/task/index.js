import { setLocalSchedule, delay, cancelAllSchedule } from "../lib/index.js";
import { allConfig } from "../db/configDb.js";
import { getScheduleList, updateSchedule } from "../proxy/aibotk.js";
import {
  getNewsContent, getEveryDayContent, roomSay, getRoomEveryDayContent, contactSay, getCountDownContent
} from "../common/index.js";
import globalConfig from "../db/global.js";

const typeMap = {
  contact: "用户名", room: "群名"
};

/**
 * 查找发送的目标
 * type: contact  room
 * name: 目标名称
 * alias: 别名
 * wxid: wxid
 */
async function findTarget({ that, type, name, alias, wxid = "" }) {
  let target = null;
  if (type === "contact") {
    target = wxid && that.Contact.find({ id: wxid }) || name && (await that.Contact.find({ name: name })) || alias && (await that.Contact.find({ alias: alias })); // 获取你要发送的联系人
  } else {
    target = wxid && that.Room.find({ id: wxid }) || name && (await that.Room.find({ topic: name })); // 获取你要发送的群组
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
    const target = await findTarget({
      that, type: item.type, name: item.roomName || item.name, alias: item.alias || "", wxid: item.wxid || ""
    });
    if (!target) {
      console.log(`查找不到${typeMap[item.type]}：${item.roomName || item.name}`);
    } else {
      console.log(`${typeMap[item.type]}：“${item.roomName || item.name}”设置定时任务成功`);
      setLocalSchedule(time, callback.bind(null, { that, target, item }), name);
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
 * @param isMulti 是否多个目标
 * @param targets 发送的多个目标
 * @return {Promise<void>}
 */
const sendCustom = async ({ that, target, item, isMulti, targets }) => {
  for (let reply of item.contents) {
    console.log("定时任务开始发送，内容：", `${reply.type === 1 ? reply.content : reply.url}`);
    await delay(1000);
    if (item.type === "room") {
      if (!isMulti) {
        await roomSay.call(that, target, "", reply);
      } else {
        for (let single of targets) {
          await roomSay.call(that, single, "", reply);
          if (item.delay) {
            await delay(item.delay);
          } else {
            await delay(1000);
          }
        }
      }
    } else {
      if (!isMulti) {
        await contactSay.call(that, target, reply);
      } else {
        for (let single of targets) {
          await contactSay.call(that, single, reply);
          if (item.delay) {
            await delay(item.delay);
          } else {
            await delay(1000);
          }
        }
      }
    }
  }
};

/**
 * 发送新闻资讯
 * @param that
 * @param target
 * @param item
 * @param isMulti 是否多个目标
 * @param targets 发送的多个目标
 * @return {Promise<void>}
 */
const sendNews = async ({ that, target, item, isMulti, targets }) => {
  let content = await getNewsContent(item.sortId, item.endWord, item.num || 10);
  console.log("新闻资讯开始发送，内容：", content);
  await delay(200);
  if (!isMulti) {
    await target.say(content);
  } else {
    for (let single of targets) {
      await single.say(content);
      if (item.delay) {
        await delay(item.delay);
      } else {
        await delay(1000);
      }
    }
  }
};


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
  await delay(1000);
  await target.say(content);
};

/**
 * 发送倒计时
 * @param that
 * @param target
 * @param item
 * @param isMulti 是否多个目标
 * @param targets 发送的多个目标
 * @return {Promise<void>}
 */
const sendCountDown = async ({ that, target, item, isMulti, targets }) => {
  let content = await getCountDownContent(item.memorialDay, item.prefix, item.suffix, item.endWord);
  console.log("倒计时任务开始工作,发送内容：", content);
  await delay(1000);
  if (!isMulti) {
    await target.say(content);
  } else {
    for (let single of targets) {
      await single.say(content);
      if (item.delay) {
        await delay(item.delay);
      } else {
        await delay(1000);
      }
    }
  }
};

/**
 * 立即发送群消息
 * @param {*} that bot对象
 * @param {*} item 任务项  { target: 'Room', event: '', message: { roomName: '', type: 'news 新闻 ||task 定时任务', contents: [] } }
 */
async function sendTaskMessage(that, info) {
  try {
    const item = info.message;
    item.type = item.type ? item.type : "room";
    const target = await findTarget({
      that, type: item.type, name: item.roomName || item.name, alias: item.alias || "", wxid: item.wxid || ""
    });
    if (!target) {
      console.log(`查找不到${typeMap[item.type]}：${item.roomName || item.name}`);
    } else {
      if (info.event === "roomNews" || info.event === "news") {
        await sendNews({ that, target, item });
      } else if (info.event === "roomTask" || info.event === "custom") {
        await sendCustom({ that, target, item });
      } else if (info.event === "wechatEveryday") {
        await sendEveryDay({ that, target, item });
      } else if (info.event === "countdown") {
        await sendCountDown({ that, target, item });
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
    setLocalSchedule(time, async () => {
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
    }, name);
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
        setTask(that, { type: "contact", ...item }, `task_day_${index}`, sendEveryDay);
      });
    }
    // 新闻资讯定时任务
    if (roomNewsSchedule && roomNewsSchedule.length > 0) {
      roomNewsSchedule.forEach((item, index) => {
        setTask(that, { type: "room", ...item }, `task_news_${index}`, sendNews);
      });
    }
    // 自定义内容定时任务
    if (roomTaskSchedule && roomTaskSchedule.length > 0) {
      roomTaskSchedule.forEach((item, index) => {
        setTask(that, { type: "room", ...item }, `task_custom_${index}`, sendCustom);
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


async function getMultiTargets(that, type, task) {
  const targets = [];
  if (task.isAll) {
    const allTargets = type === "room" ? await that.Room.findAll() : await that.Contact.findAll();
    if (task.excludeTargets) {
      allTargets.forEach(target => {
        const find = type === "room" ? task.excludeTargets.find(eItem => target.id === eItem.id || target.topic() === eItem.name) : task.excludeTargets.find(eItem => target.id === eItem.id || target.name() === eItem.name);
        if (type === "room") {
          if (!find) {
            targets.push(target);
          }
        } else {
          if (!find && target.friend()) {
            targets.push(target);
          }
        }
      });
    }
  } else {
    for (let target of task.targets) {
      const finalTarget = type === "room" ? await that.Room.find({
        id: target.id, topic: target.name
      }) : await that.Contact.find({ id: target.id, name: target.name });

      if (finalTarget) {
        targets.push(finalTarget);
      } else {
        console.log(`定时任务查找不到${type === "room" ? "群" : "好友"}：${target.name}，请检查${type === "room" ? "群名" : "好友昵称"}是否正确`);
      }
    }
  }
  return targets;
}


/**
 * 立即发送批量任务消息
 * @param {*} that bot对象
 * @param {*} item 任务项  { target: 'Room', event: '', message: { roomName: '', type: 'news 新闻 ||task 定时任务', contents: [] } }
 */
async function sendMultiTaskMessage(that, task) {
  try {
    const targets = await getMultiTargets(that, task.type, task);
    if (!targets.length) {
      console.log("查找不到要发送的目标，请检查后重试");
      return;
    }

    if (task.taskType ==='news') {
      await sendNews({ that, isMulti: true, targets, item: task.taskInfo });
    } else if (task.taskType ==='custom') {
      await sendCustom({ that, isMulti: true, targets, item: { ...task.taskInfo, type: task.type } });
    } else if (task.taskType === "countdown") {
      await sendCountDown({ that, isMulti: true, targets, item: task.taskInfo });
    }
  } catch (error) {
    console.log("立即发送定时任务失败：", error);
  }
}

async function setMultiTask(that, task) {
  try {
    // 获取要发送的目标
    const targets = await getMultiTargets(that, task.type, task);
    if (!targets.length) {
      return;
    }
    if (task.taskType === "news") {
      setLocalSchedule(task.cron, sendNews.bind(null, {
        that,
        isMulti: true,
        targets,
        item: task.taskInfo
      }), `schedule_news_${task.id}`);
    } else if (task.taskType === "custom") {
      setLocalSchedule(task.cron, sendCustom.bind(null, {
        that,
        isMulti: true,
        targets,
        item: { ...task.taskInfo, type: task.type }
      }), `schedule_custom_${task.id}`);
    } else if (task.taskType === "countDown") {
      setLocalSchedule(task.cron, sendCountDown.bind(null,{
        that,
        isMulti: true,
        targets,
        item: task.taskInfo
      }), `schedule_countdown_${task.id}`);
    }
  } catch (e) {
    console.log("catch error:" + e);
  }
}

/**
 * 初始化批量定时任务
 * @param that
 */
function initMultiTask(that) {
  try {
    cancelAllSchedule("schedule");
    const tasks = globalConfig.getAllTasks(); // 获取所有任务
    if (tasks && tasks.length) {
      tasks.forEach((item, index) => {
        void setMultiTask(that, item);
      });
    }
  } catch (e) {
    console.log("initMultiTask error:" + e);
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
export { initMultiTask };
export { initTimeSchedule };
export { sendTaskMessage };
export { sendMultiTaskMessage };
export default {
  initTaskLocalSchedule, initAllSchedule, initTimeSchedule
};
