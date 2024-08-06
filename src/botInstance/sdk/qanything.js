import axios from 'axios';
const BASE_URL = 'https://openapi.youdao.com';

const routes = {
  // 发起对话
  creatChat: {
    method: 'POST', url: () => '/q_anything/api/bot/chat_stream',
  }
};

class QAnyClient {
  constructor({ apiKey, baseUrl = BASE_URL, debug = false, stream = true, botId }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || BASE_URL;
    this.debug = debug;
    this.stream = stream;
    this.botId = botId;
    this.history = []
  }

  updateApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  async sendRequest({ method, endpoint, data, params, stream = false, headerParams = {}, timeoutMs = 100 * 1000 }) {
    const headers = {
      ...{
        Authorization: `${this.apiKey}`,
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
  }
}

class QAnyApi extends QAnyClient {
  async sendMessage(query, {
    needHistory,
   user, timeoutMs = 100 * 1000, variables,
  }) {
    if(needHistory) {
      this.history = this.history.slice(-2)
    } else {
      this.history = []
    }
    const data = {
      uuid: this.botId,
      question: query,
      history: this.history
    };

    const res = await this.sendRequest({
      method: routes.creatChat.method,
      endpoint: routes.creatChat.url(),
      data,
      stream: this.stream,
      timeoutMs,
    });

    const asyncSSE = stream => {
      return new Promise((resolve, reject) => {
        const answers = [];
        let answer = '';
        let id = '';
        const chunks = [];
        try {
          stream.on('data', data => {
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
                // console.log('json 解析错误，不影响输出', stream)
                try {
                  res = JSON.parse(stream) || {};
                } catch (e) {
                  // console.log('json 解析错误，不影响输出', stream)
                }
              }

              if(res.errorCode && res.errorCode!=='0') {
                console.log('QAnything 请求报错', res.msg)
                answer = res.msg
              } else if(res.errorCode) {
                if(res.result.response && !res.result.singleQAId) {
                  answers.push(res.result.response);
                }
                if(res.result.singleQAId) {
                  this.history = res.result.history
                  id = res.result.singleQAId
                  answer = res.result.response
                }
              }
            }
            if(!answer) {
              answer = answers.join('');
            }
            resolve({ text: answer, conversationId: '', id: id });
          });
        } catch (e) {
          resolve({ text: `agent 出错，${e}`, conversationId: '', files: [] });
        }
      });
    };
    console.log('进入流式输出模式，请耐心等待模型的思考');
    const result = await asyncSSE(res.data);

    return result;

  }
}

export {
 QAnyApi
};