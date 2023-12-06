class MultiReply {
  constructor() {
    this.userName = ''
    this.startTime = 0 // 开始时间
    this.queryList = [] // 用户说的话
    this.replys = [] // 每次回复，回复用户的内容（列表）
    this.reply_index = 0 // 回复用户的话回复到第几部分
    this.step = 0 // 当前step
    this.stepRecord = [] // 经历过的step
    this.lastReply = {} // 最后回复的内容
    this.imageData = '' // 用户发送的图片
  }

  paramsInit() {
    this.startTime = 0 // 开始时间
    this.queryList = [] // 用户说的话
    this.replys = [] // 每次回复，回复用户的内容（列表）
    this.reply_index = 0 // 回复用户的话回复到第几部分
    this.step = 0 // 当前step
    this.stepRecord = [] // 经历过的step
    this.lastReply = {} // 最后回复的内容
    this.imageData = '' // 用户发送的图片
  }
}

class BotManage {
  constructor(maxuser = 50, that, config) {
    this.Bot = that;
    this.config = config;
    this.userBotDict = {}; // 存放所有对话的用户
    this.userTimeDict = {};
    this.maxuser = maxuser; // 最大同时处理的用户数
    this.loopLimit = 4;
    this.replyList = [
      { type: 1, content: "请输入你想对此图片提出的问题" }
    ];
  }

  async creatBot(username, content) {
    console.log("bot process create");
    this.userBotDict[username] = new MultiReply();
    this.userBotDict[username].userName = username;
    this.userBotDict[username].imageData = content.url;
    return await this.updateBot(username, content);
  }

  // 更新对话
  async updateBot(username, content) {
    console.log(`更新{${username}}对话`);
    this.userTimeDict[username] = new Date().getTime();
    this.userBotDict[username].queryList.push(content);
    return await this.talk(username, content);
  }

  async talk(username, content) {
    // 防止进入死循环
    if (this.userBotDict[username].stepRecord.length >= this.loopLimit) {
      const arr = this.userBotDict[username].stepRecord.slice(-1 * this.loopLimit);
      if (arr.reduce((x, y) => x * y) === this.userBotDict[username].stepRecord[this.userBotDict[username].stepRecord.length - 1] ** this.loopLimit) {
        this.userBotDict[username].step = 100;
      }
    }
    // 对话结束
    if (this.userBotDict[username].step == 100) {
      this.userBotDict[username].paramsInit();
      this.userBotDict[username] = this.addReply(username, {
        type: 1,
        content: "你已经输入太多错误指令了，小图已经不知道怎么回答了，还是重新发送照片吧"
      });
      return this.userBotDict[username];
    }
    // 图片处理完毕后
    if (this.userBotDict[username].step == 101) {
      this.userBotDict[username].paramsInit();
      this.userBotDict[username] = this.addReply(username, {
        type: 1,
        content: "你的图片已经生成了，如果还想体验的话，请重新发送照片"
      });
      return this.userBotDict[username];
    }
    if (this.userBotDict[username].step == 0) {
      console.log("第一轮对话,询问用户需要对图片做什么问答");
      this.userBotDict[username].stepRecord.push(0);
      if (content.type === 3) {
        this.userBotDict[username].step += 1;
        this.userBotDict[username] = this.addReply(username, this.replyList[0]);
        return this.userBotDict[username];
      }
    } else if (this.userBotDict[username].step == 1) {
      console.log("第二轮对话，用户输入了需要提问的内容");
      this.userBotDict[username].stepRecord.push(1);
      if (content.type === 1) {
        // 用户选择了漫画模式
        this.userBotDict[username].step = 101;
        return await this.generateImage(username);
      }
    }
  }

  addReply(username, replys) {
    this.userBotDict[username].replys.push(replys);
    this.userBotDict[username].replys_index = this.userBotDict[username].replys.length - 1;
    return this.userBotDict[username];
  }

  removeBot(dictKey) {
    console.log("bot process remove", dictKey);
    delete this.userTimeDict[dictKey];
    delete this.userBotDict[dictKey];
  }

  getBotList() {
    return this.userBotDict;
  }

  /**
   * 生成图片
   * @param {*} username 用户名
   * @returns
   */
  async generateImage(username) {
    const image = await generateCarton(this.config, this.userBotDict[username].imageData, {
      model: this.userBotDict[username].model,
      gender: this.userBotDict[username].gender,
      age: this.userBotDict[username].age
    });
    this.userBotDict[username] = this.addReply(username, image);
    return this.userBotDict[username];
  }

  getImage(username, content, step) {
    this.userBotDict[username].paramsInit();
    this.userBotDict[username].step = step;
    if (content.type === 3) {
      this.userBotDict[username].imageData = content.url;
    }
    let replys = {
      type: 1,
      content: "请输入你想对此图片提出的问题"
    };
    this.userBotDict[username] = this.addReply(username, replys);
    return this.userBotDict[username];
  }

  // 对话入口
  async run(username, content) {
    if (content.type === 1) {
      if (Object.keys(this.userTimeDict).includes(username)) {
        return this.updateBot(username, content);
      }
    } else if (content.type === 3) {
      if (Object.keys(this.userTimeDict).includes(username)) {
        console.log(`${username}用户正在对话环境中`);
        return this.getImage(username, content, 1);
      } else {
        if (this.userBotDict.length > this.maxuser) {
          const minNum = Math.min(...Object.values(this.userTimeDict));
          const earlyIndex = Object.values(this.userTimeDict).indexOf(minNum);
          const earlyKey = Object.keys(this.userTimeDict)[earlyIndex];
          this.removeBot(earlyKey);
        }
        return await this.creatBot(username, content);
      }
    }
  }
}

export { BotManage };
