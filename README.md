# Wechaty Web Panel

[![Wechaty Plugin Web Panel](https://img.shields.io/badge/Wechaty%20Plugin-WebPanel-brightgreen.svg)](https://github.com/gengchen528/wechaty-web-panel)
[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-brightgreen.svg)](https://github.com/Wechaty/wechaty)

Wechaty Web Panel插件，让你的wechaty机器人快速接入web控制面板

## 面板主要功能

- [x] 微信每日说,定时给女朋友发送每日天气提醒，以及每日一句

* 定时提醒

- [x] 当天定时提醒  例："提醒 我 18:00 下班了，记得带好随身物品"
- [x] 每天定时提醒  例："提醒 我 每天 18:00 下班了，记得带好随身物品"
- [x] 指定日期提醒  例："提醒 我 2019-05-10 8:00 还有7天是女朋友生日了，准备一下"
* 智能机器人
- [x] 天行机器人
- [x] 图灵机器人
- [x] 腾讯闲聊机器人
- [ ] 更多

* 群定时任务
- [x] 群新闻定时发送
- [x] 群消息定时发送
- [ ] 更多功能等你来pr

* 关键词
- [x] 关键词加好友
- [x] 关键词加群
- [x] 关键词回复
- [x] 关键词事件
  - [x] 天气查询 例："上海天气"
  - [x] 垃圾分类 例："?香蕉皮"
  - [x] 名人名言 例： "名人名言"
  - [x] 老黄历查询 例： "黄历2019-6-13"
  - [x] 姓氏起源 例： "姓陈"
  - [x] 星座运势 例： "*双子座"
  - [x] 神回复 例： "神回复"
  - [x] 获取表情包 例： "表情包你好坏"
  - [x] 获取美女图 例： "美女图"
  - [ ] 更多待你发现
- [x] 进群自动欢迎
- [x] 加好友自动回复
* 自动更新配置文件，无需重启
- [x] 默认给机器人发送 ‘更新’ 触发拉取新配置文件操作，可在面板`小助手配置->关键词回复->关键词事件`进行修改关键词

更多详情介绍：[传送门](https://www.xkboke.com/web-inn/secretary/client.html#%E5%B0%8F%E5%8A%A9%E6%89%8B%E5%8A%9F%E8%83%BD%E4%B8%80%E8%A7%88)


## 提前准备

### 注册智能微秘书管理账号

1. 注册：[智能微秘书](https://wechat.aibotk.com/#/signup)

2. 初始化配置文件`小助手配置->基础配置`，修改后保存

3. 个人中心获取`APIKEY`和`APISECRET`，后续配置用到

![](./doc/img/user-center.png)

## 开始

### Step 1: 安装

```
$ npm install wechaty-web-panel@latest wechaty@latest --save
```

### Step 2: 创建机器人并配置插件的`apiKey`和`apiSecret`

```
$ vim mybot.js

const { Wechaty } = require('wechaty');
const WechatyWebPanelPlugin = require('wechaty-web-panel');
const name = 'wechat-assistant'
const bot = new Wechaty({
              name, // generate xxxx.memory-card.json and save login data for the next login
            });

bot
  .use(WechatyPanelPlugin({apiKey:'', apiSecret: ''}))
  .start()
  .catch((e) => console.error(e));

```

### Step 3: 运行

```
$ node mybot.js
```

### Step 4: 扫码进入

进入面板`小助手配置->登录状态`扫码登录，或直接扫码控制台二维码登录

![](./doc/img/qrcode-s.png)

## 面板预览

![](./doc/img/qrcode.png)
![](./doc/img/everyday.png)
![](./doc/img/schedule.png)
![](./doc/img/event.png)
![](./doc/img/material.png)

## 功能预览

![](./doc/img/news.jpeg)

个人定时与群定时任务

![](./doc/img/func.jpeg)

功能一览
