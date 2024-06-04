# Wechaty Web Panel

[![Wechaty Plugin Web Panel](https://img.shields.io/badge/Wechaty%20Plugin-WebPanel-brightgreen.svg)](https://github.com/gengchen528/wechaty-web-panel)
[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-brightgreen.svg)](https://github.com/Wechaty/wechaty)
[![NPM Version](https://badge.fury.io/js/wechaty-web-panel.svg)](https://www.npmjs.com/package/wechaty-web-panel)

Wechaty Web Panel 插件，让你的 Wechaty 机器人快速接入 web 控制面板

本项目为插件源码，非直接运行的项目。如需可直接运行的项目，请直接拉取 [https://github.com/leochen-g/wechat-assistant-pro](https://github.com/leochen-g/wechat-assistant-pro) 即可

## 快速测试

### 下载源码并安装依赖

```sh
git clone https://github.com/leochen-g/wechaty-web-panel.git
cd wechaty-web-panel
npm install # 可指定淘宝镜像源加速: --registry=https://registry.npmmirror.com
```

### 测试微信

在 test/wechat.js文件中填入apiKey与apiSecret，运行如下命令
```sh
npm run test:wechat
```

### 测试企业微信
需要有企业微信token，在test/wework.js填入workProToken、apiKey与apiSecret，运行如下命令
```sh
npm run test:wework
```

## 面板主要功能

* 定时提醒

- [x] 当天定时提醒 例："提醒 我 18:00 下班了，记得带好随身物品"
- [x] 每天定时提醒 例："提醒 我 每天 18:00 下班了，记得带好随身物品"
- [x] 指定日期提醒 例："提醒 我 2019-05-10 8:00 还有 7 天是女朋友生日了，准备一下"

* 智能机器人

- [x] 天行机器人
- [x] 图灵机器人
- [x] 腾讯闲聊机器人
- [x] ChatGPT api (支持切换模型)
- [x] ChatGPT 网页hook
- [x] 微信对话开放平台
- [x] Dify 平台和FastGPT无缝适配
- [x] GPT-4V识图功能
- [ ] 更多

* 定时任务

- [x] 新闻定时发送
- [x] 倒计时提醒
- [x] 自定义内容定时发送
- [x] 个性化内容定制
- [x] 微信每日说,定时给女朋友和群友发送每日天气提醒，以及每日一句
- [ ] 更多功能等你来 pr

* 技能中心

- [x] 关键词加好友
- [x] 关键词加群，群欢迎词设置
- [x] 关键词回复
- [x] 关键词事件
  - [x] 天气查询 例："上海天气"
  - [x] 垃圾分类 例："?香蕉皮"
  - [x] 名人名言 例： "名人名言"
  - [x] 老黄历查询 例： "黄历 2019-6-13"
  - [x] 姓氏起源 例： "姓陈"
  - [x] 星座运势 例： "\*双子座"
  - [x] 神回复 例： "神回复"
  - [x] 获取表情包 例： "表情包你好坏"
  - [x] 获取美女图 例： "美女图"
  - [x] 群合影 例： "群合影"
  ~~- [x] 牛年头像 例： "牛气冲天"~~
  ~~- [x] 国旗头像 例： "我要国旗"(下线)~~
  - [ ] 更多待你发现
- [x] 进群自动欢迎
- [x] 加好友自动回复
- [x] 自定义回调事件
- [x] 私聊消息同步到群或好友

* 自动更新配置文件，无需重启

- [x] 默认给机器人发送 ‘更新’ 触发拉取新配置文件操作，可在面板`小助手配置->关键词回复->关键词事件`进行修改关键词

* 特色功能

~~- [x] 群合影(下线)~~
- [x] 主动发送消息
- [x] 主动更新配置
- [x] 主动同步好友和群列表
- [x] 跨群聊天，打通多群沟通
- [x] 回调事件
- [x] 群发助手，转发助手
- [x] openapi请求
- [x] rss订阅推送

更多详情介绍：[传送门](https://help.aibotk.com/?plugin=czw_emDoc&post=2)

## 提前准备

### 注册智能微秘书管理账号

1. 注册：[智能微秘书](https://wechat.aibotk.com/#/signup)

2. 初始化配置文件`小助手配置->基础配置`，修改后保存

3. 个人中心获取`APIKEY`和`APISECRET`，后续配置用到

![](./doc/img/user-center.png)

### 注册天行数据账号

由于本项目大部分定时资讯和一些天气接口来自于天行数据，所以需要提前准备好天行数据的账号，同时申请好相关接口的权限

1、注册: [天行数据](https://www.tianapi.com/source/865c0f3bfa)

2、申请接口权限

必选接口
* [天行机器人](https://www.tianapi.com/apiview/47)
* [天气](https://www.tianapi.com/apiview/72)
* [新闻](https://www.tianapi.com/apiview/51)
* [垃圾分类](https://www.tianapi.com/apiview/97)
  
可选接口（如果想使用相应的功能还是必须申请的），但是如果默认使用了天行机器人，以下功能接口无需申请也可以，机器人会直接返回对应信息

* [土味情话](https://www.tianapi.com/apiview/80)
* [名人名言](https://www.tianapi.com/apiview/92)
* [星座运势](https://www.tianapi.com/apiview/78)
* [姓氏起源](https://www.tianapi.com/apiview/94)
* [顺口溜](https://www.tianapi.com/apiview/54)
* [老黄历](https://www.tianapi.com/apiview/45)
* [神回复](https://www.tianapi.com/apiview/39)
* [歇后语](https://www.tianapi.com/apiview/38)
* [绕口令](https://www.tianapi.com/apiview/37)
* [疫情](https://www.tianapi.com/apiview/169)
* [网络取名](https://www.tianapi.com/apiview/36)

## 开始

> 环境node > 16

### Step 1: 安装

```
$ npm install wechaty-web-panel@latest wechaty@latest --save
```

如果安装长时间没有反应，可以尝试

```
npm install wechaty-web-panel@latest wechaty@latest --save
```

### Step 2: 创建机器人并配置插件的`apiKey`和`apiSecret`

```
$ vim mybot.js

const {WechatyBuilder} = require('wechaty')
const WechatyWebPanelPlugin = require('wechaty-web-panel')

const name = 'wechat-assistant'

const bot = WechatyBuilder.build({
    name, // generate xxxx.memory-card.json and save login data for the next login
    puppet: 'wechaty-puppet-wechat',
})
bot
    .use(WechatyWebPanelPlugin({
        apiKey: '',
        apiSecret: ''
    }))
    .start()
    .catch((e) => console.error(e))


```

### Step 3: 运行

```
$ node mybot.js
```

### Step 4: 扫码进入

进入面板`小助手配置->登录状态`扫码登录，或直接扫码控制台二维码登录

![](./doc/img/qrcode-s.png)

## 面板预览

![](./doc/img/index.png)
![](./doc/img/roomasync.png)
![](./doc/img/everyday.png)
![](./doc/img/event.png)
![](./doc/img/material.png)

## 功能预览

![](./doc/img/news.jpeg)

个人定时与群定时任务

![](./doc/img/func.jpeg)

群消息同步

<img src="./doc/img/async.png" width="300">
