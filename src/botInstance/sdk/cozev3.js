import axios from 'axios';
const BASE_URL = 'https://api.coze.cn';

const routes = {
  // 创建会话
  creatConversation: {
    method: 'POST', url: () => '/v1/conversation/create',
  },
  // 发起对话
  creatChat: {
    method: 'POST', url: () => '/v3/chat',
  },
  // 查看对话消息详情
  getChatList: {
    method: 'GET', url: () => '/v3/chat/message/list',
  },
  // 轮询接口状态
  retrieve: {
    method: 'GET', url: () => '/v3/chat/retrieve',
  },
  // 文件上传
  fileUpload: {
    method: 'POST',
    url: () => '/v1/files/upload',
  },
};

class CozeClient {
  constructor({ apiKey, baseUrl = BASE_URL, debug = false, systemMessage = null, stream = false, botId }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.debug = debug;
    this.stream = stream;
    this.botId = botId;
    this.systemMessage = systemMessage;
  }

  updateApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  async sendUploadRequest(
    method,
    endpoint,
    data = null,
    params = null,
    stream = false,
    headerParams = {}
  ) {
    const headers = {
      ...{
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      ...headerParams,
    };

    const url = `${this.baseUrl}${endpoint}`;
    const response = await axios({
      method,
      url,
      data,
      params,
      headers,
      responseType: 'json',
    });

    return response;
  }

  async sendRequest({ method, endpoint, data, params, stream = false, headerParams = {}, timeoutMs = 100 * 1000 }) {
    try {
      const headers = {
        ...{
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        ...headerParams,
      };

      const url = `${this.baseUrl}${endpoint}`;
      let response;
      if (this.debug) {
        console.log('request', url, { data, headers, params });
      }
      if (!stream) {
        response = await axios.request({
          method,
          url,
          data: data || {},
          params: params || {},
          headers,
          timeout: timeoutMs,
        });
      } else {
        response = await axios({
          method,
          url,
          data,
          params,
          headers,
          responseType: 'stream',
        });
      }

      return response;
    } catch (e) {
      console.log('请求报错', e)
    }
  }

  async getConversationId({ messages, timeoutMs }) {
    const res = await this.sendRequest({ method: routes.creatConversation.method,
      endpoint: routes.creatConversation.url(),
      data: {
        messages,
      },
      stream: false,
      timeoutMs });
    console.log(`创建新的会话, 获取会话Id: ${res.data.data.id}`);
    return res.data.data.id;
  }
  async retrieveStatus({conversationId, chatId, timeoutMs}) {
    return new Promise(async (resolve, reject)=> {
      let time = 0
      const checkRetry = async () => {
        const res = await this.sendRequest({ method: routes.retrieve.method,
          endpoint: routes.retrieve.url(),
          data: {},
          params: {
            conversation_id: conversationId,
            chat_id: chatId
          },
          stream: false,
          timeoutMs });
        time = time + 1
        if(res.data.code!==0) {
          console.log('coze v3 请求失败', res.data.msg)
          resolve(false)
        }
        const finishStatus = ['completed', 'required_action', 'canceled', 'failed']
        if(finishStatus.includes(res.data.data.status)) {
          resolve(true)
        } else if(time < 180) {
          let timer = setTimeout(()=> {
            void checkRetry()
            clearTimeout(timer)
            timer = null
          }, 1200)
        } else {
          resolve(false)
        }
      }
      void checkRetry()
    })

  }

  fileUpload(data) {
    return this.sendUploadRequest(routes.fileUpload.method, routes.fileUpload.url(), data, null, false, {
      'Content-Type': 'multipart/form-data',
    });
  }
}

class CozeV3Api extends CozeClient {
  async sendMessage(query, {
    systemMessage, user, needConversation = true, conversationId = null, timeoutMs = 100 * 1000, files = null, variables,
  }) {
    let messages = [
      {
        role: 'user',
        content: query,
        content_type: 'text',
      },
    ];
    if (!conversationId && needConversation) {
      conversationId = await this.getConversationId({
        messages,
        timeoutMs,
      });
      messages = [];
    }
    const data = {
      bot_id: this.botId,
      custom_variables: {
        ...variables,
      },
      additional_messages: messages,
      user_id: user,
      stream: this.stream,
      auto_save_history: true,
    };
    if (systemMessage || this.systemMessage) {
      data.custom_variables.systemMessage = systemMessage || this.systemMessage;
    }
    const params = {};
    if (conversationId && needConversation) {
      params.conversation_id = conversationId;
    }
    const res = await this.sendRequest({
      method: routes.creatChat.method,
      endpoint: routes.creatChat.url(),
      data,
      params,
      stream: this.stream,
      timeoutMs,
    });

    const asyncSSE = stream => {
      return new Promise((resolve, reject) => {
        const answers = [];
        let chatId = '';
        const chunks = [];
        try {
          stream.on('data', data => {
            const result = Buffer.concat(chunks);
            const streams = new TextDecoder('utf-8').decode(result, { stream: true });
            console.log('思考中', streams);
            chunks.push(data);
          });
          stream.on('end', async () => {
            const result = Buffer.concat(chunks);
            console.log('思考完毕，准备回复');
            const streams = new TextDecoder('utf-8').decode(result, { stream: true }).split('\n');
            for (const stream of streams) {
              let res = {};
              try {
                res = JSON.parse(stream.substring(5)) || {};
              } catch (e) {
                // console.log('json 解析错误，不影响输出', e)
              }
              if (res && res.chat_id) {
                chatId = res.chat_id;
              }
              if (res && res.conversation_id) {
                conversationId = res.conversation_id;
              }
              if (chatId && conversationId) {
                break;
              }
              if (res.type === 'answer') {
                console.log('得到回复结果', res.content);
                chatId = res.chat_id;
                conversationId = res.conversation_id;
                answers.push(res.content);
              }
            }
            const list = chatId ? await this.getConversationMessages({ conversationId, chatId, timeoutMs }) : [];
            let lastMessage = list.filter(item => item.type === 'answer');
            if (lastMessage.length) {
              lastMessage = lastMessage[0];
            }
            if (this.debug) {
              console.log('获取最后一条对话记录', lastMessage);
            }
            let answer = '';
            if (lastMessage && lastMessage.content) {
              answer = lastMessage.content;
            } else {
              answer = answers.join('');
            }

            resolve({ text: answer, conversationId, id: lastMessage.id || '' });
          });
        } catch (e) {
          resolve({ text: `AI agent 出错，${e}`, conversationId: '', files: [] });
        }
      });
    };
    if (!this.stream) {
      console.log('正在思考中,请耐心等待...');
      const checkStatus = await this.retrieveStatus({ conversationId: res.data.data.conversation_id, chatId: res.data.data.id, timeoutMs })
      if(checkStatus) {
        const list = await this.getConversationMessages({ conversationId: res.data.data.conversation_id, chatId: res.data.data.id, timeoutMs });
        let lastMessage = list.filter(item => item.type === 'answer');
        if (lastMessage.length) {
          lastMessage = lastMessage[0];
        }
        if (this.debug) {
          console.log('获取最后一条对话记录', lastMessage);
        }
        let lanswer = '';
        if (lastMessage && lastMessage.content) {
          lanswer = lastMessage.content;
        }
        return  { text: lanswer, conversationId: res.data.data.conversation_id, id: lastMessage.id || '' }
      }
      return { text: '', conversationId: '', id: '', files: [] }
    } else {
      console.log('进入流式输出模式，请耐心等待模型的思考');
      const result = await asyncSSE(res.data);

      return result;
    }
  }

  async getConversationMessages({ chatId, timeoutMs, conversationId }) {
    try {
      const res = await this.sendRequest({
        method: routes.getChatList.method,
        endpoint: routes.getChatList.url(),
        params: {
          chat_id: chatId,
          conversation_id: conversationId,
        },
        data: {},
        stream: false,
        timeoutMs,
      });

      if (res.data.code === 0) {
        return res.data.data;
      }
      console.log(`获取coze v3对话详情报错: ${JSON.stringify(res.data)}`);
      return [];
    } catch (e) {
      console.log(`获取coze v3对话详情报错: ${e}`);
      return [];
    }
  }
}

export { CozeV3Api };