import {get4vReply, getDify4vReply} from "../botInstance/gpt4v.js";
import {getImageVision} from '../proxy/multimodal.js'

class MultiReply {
  constructor() {
    this.step = 0 // 当前step
    this.stepRecord = [] // 经历过的step
    this.imageIds = [] // 用户发送的图片消息id
  }

  paramsInit() {
    this.step = 0 // 当前step
    this.stepRecord = [] // 经历过的step
    this.imageIds = [] // 用户发送的图片消息id
  }
}

class BotManage {
  constructor(maxuser = 50, that) {
    this.Bot = that;
    this.userBotDict = {}; // 存放所有对话的用户
    this.userTimeDict = {};
    this.maxuser = maxuser; // 最大同时处理的用户数
  }

  async creatBot(username, content) {
    console.log("bot process create");
    this.userBotDict[username] = new MultiReply();
    this.userBotDict[username].userName = username;
    this.userBotDict[username].imageIds = [content.id];
    setTimeout(()=> {
      console.log('清理图像识别对话缓存')
      this.removeBot(username)
    }, 10 * 60 * 1000)
    return await this.updateBot(username, content);
  }

  // 更新对话
  async updateBot(username, content, config) {
    console.log(`更新{${username}}对话`);
    this.userTimeDict[username] = new Date().getTime();
    return await this.talk(username, content, config);
  }

  async talk(username, content, config) {
    if (this.userBotDict[username].step == 0) {
      this.userBotDict[username].stepRecord.push(0);
      if (content.type === 3) {
        this.userBotDict[username].step += 1;
        // 请描述你对图片的问题，最多支持5张图片，已收到${this.userBotDict[username].imageIds.length}张图片
        return [
          { type: 1, content: '' }
        ];
      }
    } else if (this.userBotDict[username].step == 1) {
      console.log("第二轮对话，用户输入了需要提问的内容");
      this.userBotDict[username].stepRecord.push(1);
      if (content.type === 1) {
        // 用户选择了漫画模式
        const res = await this.generateImage(username, content.content, config);
        this.removeBot(username)
        return res
      }
    }
  }

  removeBot(uid) {
    delete this.userTimeDict[uid];
    delete this.userBotDict[uid];
  }

  getBotList() {
    return this.userBotDict;
  }

  /**
   * 识别图片内容
   * @param {*} username 用户名
   * @returns
   */
  async generateImage(username, question, config) {
    const images = [];
    if(config.robotType === 8) {
      // 如果是 dify 平台
      for(let id of this.userBotDict[username].imageIds) {
        const msg = await this.Bot.Message.find({ id })
        const file = await msg.toFileBox()
        images.push(file)
      }
      const replys = await getDify4vReply(images, question, config, username);
      return replys;
    } else if(config.robotType === 6) {
      for(let id of this.userBotDict[username].imageIds) {
        const msg = await this.Bot.Message.find({ id })
        const file = await msg.toFileBox()
        const base = await file.toDataURL()
        images.push(base)
      }
      const replys = await get4vReply(images, question, config);
      return replys;
    } else {
      for(let id of this.userBotDict[username].imageIds) {
        const msg = await this.Bot.Message.find({ id })
        const file = await msg.toFileBox()
        const base = await file.toDataURL()
        images.push(base)
      }
      const replys = await getImageVision(images, question, config);
      return replys;
    }
  }

  getImage(username, content, step) {
    if(this.userBotDict[username].imageIds.length === 5) {
      this.removeBot(username)
      // 本次对话已经重置，请重新发送图片
      let replys = {
        type: 1,
        content: ""
      };
      return [replys]
    }
    this.userBotDict[username].step = step;
    this.userBotDict[username].imageIds.push(content.id)
    if(this.userBotDict[username].imageIds.length === 5) {
      // 已收到5张图片，请描述你的问题，再次发送图片将会重置本次对话
      let replys = {
        type: 1,
        content: ""
      };
      return [replys]
    }
    // `请描述你的问题，最多支持5张图片，已收到${this.userBotDict[username].imageIds.length}张图片`
    let replys = {
      type: 1,
      content: ''
    };
    return [replys];
  }

  // 对话入口
  async run(userId, content, config) {
    if (content.type === 1) {
      if (Object.keys(this.userTimeDict).includes(userId)) {
        return this.updateBot(userId, content, config);
      }
      return []
    } else if (content.type === 3) {
      if (Object.keys(this.userTimeDict).includes(userId)) {
        return this.getImage(userId, content, 1);
      } else {
        if (this.userBotDict.length > this.maxuser) {
          const minNum = Math.min(...Object.values(this.userTimeDict));
          const earlyIndex = Object.values(this.userTimeDict).indexOf(minNum);
          const earlyKey = Object.keys(this.userTimeDict)[earlyIndex];
          this.removeBot(earlyKey);
        }
        return await this.creatBot(userId, content);
      }
    }
  }
}

export { BotManage };
