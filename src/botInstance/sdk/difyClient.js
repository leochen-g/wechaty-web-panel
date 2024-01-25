import axios from 'axios'

export const BASE_URL = 'https://api.dify.ai/v1'

export const routes = {
  application: {
    method: 'GET', url: () => `/parameters`
  }, feedback: {
    method: 'POST', url: (messageId) => `/messages/${messageId}/feedbacks`
  }, createCompletionMessage: {
    method: 'POST', url: () => `/completion-messages`
  }, createChatMessage: {
    method: 'POST', url: () => `/chat-messages`
  }, getConversationMessages: {
    method: 'GET', url: () => '/messages'
  }, getConversations: {
    method: 'GET', url: () => '/conversations'
  }, renameConversation: {
    method: 'PATCH', url: (conversationId) => `/conversations/${conversationId}`
  },
  deleteConversation: {
    method: 'DELETE',
    url: (conversation_id) => `/conversations/${conversation_id}`
  },
  fileUpload: {
    method: 'POST',
    url: () => `/files/upload`
  }
}

export class DifyClient {
  constructor({ apiKey, baseUrl = BASE_URL, debug = false, systemMessage = null, stream = false }) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
    this.debug = debug
    this.stream = stream
    this.systemMessage = systemMessage
  }

  updateApiKey(apiKey) {
    this.apiKey = apiKey
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
        "Content-Type": "application/json",
      },
      ...headerParams
    };

    const url = `${this.baseUrl}${endpoint}`;
    let response = await axios({
        method,
        url,
        data,
        params,
        headers,
        responseType: "json",
      });

    return response;
  }

  async sendRequest({ method, endpoint, data, params, stream = false, headerParams = {}, timeoutMs = 100 * 1000 }) {
    const headers = {
      ...{
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      ...headerParams
    }

    const url = `${this.baseUrl}${endpoint}`
    let response
    if (this.debug) {
      console.log('dify request', url, { data, headers, params })
    }
    if (!stream) {
      response = await axios({
        method,
        url,
        data: data || null,
        params: params || null,
        headers,
        timeout: timeoutMs,
        responseType: 'json'
      })
    } else {
      response = await axios({
        method,
        url,
        data,
        params,
        headers,
        responseType: "stream",
      });
    }

    return response
  }

  messageFeedback(messageId, rating, user) {
    const data = {
      rating, user
    }
    return this.sendRequest({ method: routes.feedback.method, endpoint: routes.feedback.url(messageId), data })
  }

  getApplicationParameters(user) {
    const params = { user }
    return this.sendRequest({ method: routes.application.method, endpoint: routes.application.url(), params })
  }

  fileUpload(data) {
    return this.sendUploadRequest(routes.fileUpload.method, routes.fileUpload.url(), data, null,false, {
      "Content-Type": 'multipart/form-data'
    });
  }
}

export class CompletionClient extends DifyClient {
  createCompletionMessage(inputs, user, stream = false, files = null) {
    const data = {
      inputs,
      user,
      response_mode: stream ? "streaming" : "blocking",
      files,
    };
    return this.sendRequest({
      method: routes.createCompletionMessage.method,
      endpoint: routes.createCompletionMessage.url(),
      data,
      stream
    })
  }
}

export class ChatClient extends DifyClient {
  async sendMessage(query, {
    systemMessage, user, conversationId = null, timeoutMs = 100 * 1000, files = null
  }) {
    const data = {
      inputs: {},
      query,
      user,
      response_mode: this.stream ? "streaming" : "blocking",
      files,
    }
    if (systemMessage || this.systemMessage) {
      data.inputs['systemMessage'] = systemMessage || this.systemMessage
    }
    if (conversationId) data.conversation_id = conversationId
    console.log('request data', data)
    const res = await this.sendRequest({
      method: routes.createChatMessage.method,
      endpoint: routes.createChatMessage.url(),
      data,
      stream: this.stream,
      timeoutMs
    })
    const asyncSSE = (stream) => {
      return new Promise((resolve, reject)=> {
        const answer = []
        const files = []
        let conversation_id = ''
        let id = ''
        try {
          stream.on('data', data => {
            const stream = new TextDecoder().decode(data).split('data: ')
            if(stream[1]) {
              const res = JSON.parse(stream[1]) || {}
              if(res.event === 'agent_message' && res.answer || res.event === 'message' && res.answer) {
                answer.push(res.answer)
              }
              if(res.event === 'message_file') {
                console.log('收到一个需要展示的文件，稍后发送')
                files.push(res.url)
              }
              if(res.event === 'message_end') {
                console.log('流数据接收完毕，正在组装数据进行发送')
                conversation_id = res.conversation_id
                id = res.id
              }
              if(res.event === 'error') {
                console.log(`流式输出错误code:${res.code}`, res.message)
                answer.push(res.message)
              }
            }
          });
          stream.on('end', () => {
            resolve({ text: answer.join(''), conversationId: conversation_id, id,  files })
          });
        } catch (e) {
          resolve({ text: `AI agent 出错，${e}`, conversationId: '', files: [] })
        }
      })
    }
    if(!this.stream) {
      if (res.data.code) {
        if (this.debug) {
          console.log('dify request error', res.data.code, res.data.message)
        }
        return Promise.reject(res.message)
      }

      const response = res.data
      return {
        text: response.answer,
        conversationId: response.conversation_id,
        files: [],
        id: response.id
      }
    } else {
      console.log('进入Dify智能助手输出模式，请耐心等待模型的思考')
      const result = await asyncSSE(res.data);
      console.log('result', result)
      return  result;
    }
  }

  getConversationMessages(user, conversationId = '', firstId = null, limit = null) {
    const params = { user }

    if (conversationId) params.conversation_id = conversationId

    if (firstId) params.first_id = firstId

    if (limit) params.limit = limit

    return this.sendRequest({
      method: routes.getConversationMessages.method, endpoint: routes.getConversationMessages.url(), params
    })
  }

  getConversations(user, firstId = null, limit = null, pinned = null) {
    const params = { user, first_id: firstId, limit, pinned }
    return this.sendRequest({
      method: routes.getConversations.method, endpoint: routes.getConversations.url(), params
    })
  }

  renameConversation(conversationId, name, user) {
    const data = { name, user }
    return this.sendRequest({
      method: routes.renameConversation.method, endpoint: routes.renameConversation.url(conversationId), data
    })
  }
}
