import axios from "axios";

export const BASE_URL = "https://api.dify.ai/v1";

export const routes = {
  application: {
    method: "GET",
    url: () => `/parameters`
  },
  feedback: {
    method: "POST",
    url: (messageId) => `/messages/${messageId}/feedbacks`
  },
  createCompletionMessage: {
    method: "POST",
    url: () => `/completion-messages`
  },
  createChatMessage: {
    method: "POST",
    url: () => `/chat-messages`
  },
  getConversationMessages: {
    method: "GET",
    url: () => "/messages"
  },
  getConversations: {
    method: "GET",
    url: () => "/conversations"
  },
  renameConversation: {
    method: "PATCH",
    url: (conversationId) => `/conversations/${conversationId}`
  }

};

export class DifyClient {
  constructor({ apiKey, baseUrl = BASE_URL, debug = false, systemMessage = null }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.debug = debug;
    this.systemMessage = systemMessage
  }

  updateApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  async sendRequest({ method, endpoint, data, params, stream = false, timeoutMs = 60 * 1000 }) {
    const headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json"
    };

    const url = `${this.baseUrl}${endpoint}`;
    let response;
    if (this.debug) {
      console.log("dify request", url, { data, headers, params });
    }
    if (!stream) {
      response = await axios({
        method,
        url,
        data: data || null,
        params: params || null,
        headers,
        timeout: timeoutMs,
        responseType: stream ? "stream" : "json"
      });
    } else {
      response = await fetch(url, {
        headers,
        method,
        body: JSON.stringify(data)
      });
    }

    return response;
  }

  messageFeedback(messageId, rating, user) {
    const data = {
      rating,
      user
    };
    return this.sendRequest({ method: routes.feedback.method, endpoint: routes.feedback.url(messageId), data });
  }

  getApplicationParameters(user) {
    const params = { user };
    return this.sendRequest({ method: routes.application.method, endpoint: routes.application.url(), params });
  }
}

export class CompletionClient extends DifyClient {
  createCompletionMessage(inputs, query, user, responseMode) {
    const data = {
      inputs,
      query,
      responseMode,
      user
    };
    return this.sendRequest({
      method: routes.createCompletionMessage.method,
      endpoint: routes.createCompletionMessage.url(),
      data,
      stream: responseMode === "streaming"
    });
  }
}

export class ChatClient extends DifyClient {
  async sendMessage(query, { systemMessage, user, responseMode = "json", conversationId = null, timeoutMs = 60 * 1000 }) {
    const data = {
      inputs: {},
      query,
      user,
      responseMode
    };
    if(systemMessage || this.systemMessage) {
      data.inputs['systemMessage'] = systemMessage || this.systemMessage
    }
    if (conversationId)
      data.conversation_id = conversationId;
    console.log('request data', data);
    const res = await this.sendRequest({
      method: routes.createChatMessage.method,
      endpoint: routes.createChatMessage.url(),
      data,
      stream: responseMode === "streaming",
      timeoutMs
    })

    if(res.data.code) {
      if (this.debug) {
        console.log("dify request error", res.data.code, res.data.message);
      }
      return Promise.reject(res.message)
    }

    const response = res.data;
    return {
      text: response.answer,
      conversationId: response.conversation_id,
      id: response.id
    };
  }

  getConversationMessages(user, conversationId = "", firstId = null, limit = null) {
    const params = { user };

    if (conversationId)
      params.conversation_id = conversationId;

    if (firstId)
      params.first_id = firstId;

    if (limit)
      params.limit = limit;

    return this.sendRequest({
      method: routes.getConversationMessages.method,
      endpoint: routes.getConversationMessages.url(),
      params
    });
  }

  getConversations(user, firstId = null, limit = null, pinned = null) {
    const params = { user, first_id: firstId, limit, pinned };
    return this.sendRequest({ method: routes.getConversations.method, endpoint: routes.getConversations.url(), params });
  }

  renameConversation(conversationId, name, user) {
    const data = { name, user };
    return this.sendRequest({
      method: routes.renameConversation.method,
      endpoint: routes.renameConversation.url(conversationId),
      data
    });
  }
}
