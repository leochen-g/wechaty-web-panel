# Wechaty Web Panel

[![Wechaty Plugin Web Panel](https://img.shields.io/badge/Wechaty%20Plugin-WebPanel-brightgreen.svg)](https://github.com/Gcaufy/wechaty-schedule)
[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-brightgreen.svg)](https://github.com/Wechaty/wechaty)

Wechaty Web Panel让你使用插件，快速接入web控制面板


## Get Start


### Step 1: Install

```
$ npm install wechaty-web-panel --save
```

### Step 2: Make a tasks

```
$ vim tasks.json

{
  // Task name
  "task-1": {
    // Message(s) will be sent in 13:00 everyday
    "time": "16:00:00",
    // [String|Array], Which room(s) you want to send the message(s). Set empty if you don't need a room.
    "room": ["My Chating Group1", "My Chating Group2"],
    // [String|Array], Who you want to send the message(s).
    "contact": "",
    // [String|Array], Message(s) you want to send.
    "content": ["Today is a nice day!", "It's time to have a cup of tea."]
  },
  "task-2": {
    // Message(s) will be send in that time
    "time": "2018/01/01 00:00:00",
    "room": "",
    "contact": ["Gcaufy", "Zixia"],
    "content": "Happy New Year"
  }
}
```

### Step 3: Make a bot

```
$ vim mybot.js

const { Wechaty } = require('wechaty');
const WechatySechdulePlugin = require('wechaty-schedule');
const bot = Wechaty.instance();

bot.use(WechatySechdulePlugin({ tasks: './tasks.json' }))
.on('scan', (url, code) => console.log(`Scan QR Code to login: ${code}\n${url}`))
.on('login', user => console.log(`User ${user} logined`))
.init();
```

### Step 4: Run

```
$ node mybot.js
```


## Reference

* [Wechaty](https://github.com/Chatie/wechaty)
