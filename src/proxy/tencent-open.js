import jwt from "jsonwebtoken";
import { allConfig } from "../db/configDb.js";
import axios from "axios";
import { getPuppetEol, isNotWebPuppet } from "../const/puppet-type.js";

async function getSignature(id, encodingAESKey) {
  const token = jwt.sign(
    {
      userid: id
    },
    encodingAESKey,
    { algorithm: "HS256" }
  );
  return token;
}

function checkType(answer) {
  var i = "";
  i = "[object Object]" === Object.prototype.toString.call(answer) ? JSON.stringify(answer) : answer;
  var s = "text";
  return (
    /{\s*"miniprogrampage"\s*:/.test(i)
      ? (s = "miniprogrampage")
      : /{\s*"image"\s*:/.test(i)
        ? (s = "image")
        : /{\s*"file"\s*:/.test(i)
          ? (s = "file")
          : /{\s*"mpnews"\s*:/.test(i)
            ? (s = "mpnews")
            : /{\s*"news"\s*:/.test(i)
              ? (s = "news")
              : /{\s*"video"\s*:/.test(i)
                ? (s = "video")
                : /{\s*"voice"\s*:/.test(i)
                  ? (s = "voice")
                  : /{\s*"callback"\s*:/.test(i)
                    ? (s = "callback")
                    : /weather_ans_detail/.test(i)
                      ? (s = "weather")
                      : /{\s*"json"\s*:/.test(i)
                        ? (s = "json")
                        : /^\[({.*:.*})*\]$/.test(i) && (s = "nndialog"),
      s
  );
}

/**
 * 判断是不是多个回复
 * @param answer
 * @returns {boolean}
 */
function isMultiple(answer) {
  return /{\s*"multimsg"\s*:/.test(answer);
}

/**
 * 对多重回复的处理
 * @param answer
 */
function getMultiList(answer) {
  const multiList = JSON.parse(answer).multimsg;
  const res = multiList.map(function(item, index) {
    if ("[object Object]" === Object.prototype.toString.call(item)) {
      return JSON.stringify(item);
    } else {
      return item;
    }
  });
  return res;
}

/**
 * 格式化开放平台回复内容
 * @param answer
 * @param options
 * @param userInfo
 * @returns {*[]}
 */
async function getFormatReply(answer, options = [], userInfo) {
  const eol = await getPuppetEol();
  const isNotWeb = await isNotWebPuppet();
  const answerType = checkType(answer);
  if (answerType !== "text") {
    answer = JSON.parse(answer);
  }
  let replys = [];
  let reply = {};
  switch (answerType) {
    case "text":
      reply = {
        type: 1,
        content: answer
      };
      if (options && options.length) {
        options.forEach((item) => {
          reply.content = reply.content + `(请输入完整的文字和序号，可以拷贝)${eol}` + item.title;
        });
      }
      replys = [reply];
      break;
    case "image":
      if (Array.isArray(answer.image)) {
        replys = answer.image.map((item) => {
          return {
            type: 2,
            url: item.image.url
          };
        });
        break;
      } else {
        replys = [{ type: 2, url: answer.image.url }];
        break;
      }
    case "video":
      if (answer.video && (answer.video.url || answer.video.cover_url)) {
        replys = [{ type: 2, url: answer.video.url ? answer.video.url : answer.video.cover_url }];
        break;
      }
      break;
    case "news":
      if (!isNotWeb) {
        replys = [
          {
            type: 1,
            content: `【标题】${answer.news.articles[0].title}${eol}【描述】${answer.news.articles[0].description}${eol}【访问地址】${answer.news.articles[0].url}${eol} 【缩略图】正在路上...`
          },
          { type: 2, url: answer.news.articles[0].picurl }
        ];
      } else {
        replys = [{
          type: 4,
          url: answer.news.articles[0].url,
          title: answer.news.articles[0].title,
          thumbUrl: answer.news.articles[0].picurl,
          description: answer.news.articles[0].description
        }];
      }
      break;
    case "mpnews":
      if (!isNotWeb) {
        replys = [
          { type: 1, content: `【标题】${answer.mpnews.title}${eol}【内容】${answer.mpnews.digest}${eol}【缩略图】正在路上...` },
          { type: 2, url: answer.mpnews.imgurl }
        ];
      } else {
        replys = [{
          type: 4,
          url: answer.mpnews.imgurl,
          title: answer.mpnews.title,
          thumbUrl: answer.mpnews.imgurl,
          description: answer.mpnews.digest
        }];
      }
      break;
    case "voice":
      if (answer.voice && answer.voice.url) {
        replys = [{ type: 2, url: answer.voice.url }];
        break;
      }
      break;
    case "json":
      if (answer.json) {
        replys = [{ type: 1, content: JSON.stringify(answer.json) }];
        break;
      }
      break;
    case "miniprogrampage":
      if (!isNotWeb) {
        replys = [{ type: 1, content: "收到了一个小程序，但是小秘书还没学会展示😭，等等我回去再修炼五百年💪" }];
      } else {
        replys = [{
          type: 5,
          appid: answer.miniprogrampage.appid,
          title: answer.miniprogrampage.title,
          pagePath: answer.miniprogrampage.pagepath,
          description: answer.miniprogrampage.title,
          thumbUrl: answer.miniprogrampage.thumb_url,
          thumbKey: undefined,
          username: answer.miniprogrampage.appid
        }];
      }
      break;
    default:
      break;
  }
  return replys;
}

async function getTencentOpenReply({ msg, id, userInfo }) {
  const config = await allConfig();
  const isNotWeb = await isNotWebPuppet();
  const eol = await getPuppetEol();
  if (!config.tencentAESKey || !config.tencentToken) {
    console.log("请到智能微秘书平台配置AESKey 和token 参数方可使用");
    return [{ type: 1, content: "请到平台配置AESKey 和token 参数方可使用" }];
  }
  try {
    const signature = await getSignature(id, config.tencentAESKey);
    const data = {
      signature,
      query: msg
    };
    const res = await axios.post(`https://openai.weixin.qq.com/openapi/aibot/${config.tencentToken}`, data, {});
    const resData = res.data;
    if (!resData.errcode) {
      let answer = resData.answer; // 存放回答
      if (resData.answer_type === "music") {
        // web 端协议以文字和图片的形式发送
        if (isNotWeb) {
          const res = JSON.parse(resData.answer);
          const music = res.news.articles[0];
          const musicContent = `【歌名】：《${music && music.title}》${eol}【听歌地址】：${music && music.url}`;
          const musicPic = music && music.picurl;
          return [
            {
              type: 1,
              content: musicContent
            },
            {
              type: 2,
              url: musicPic
            }
          ];
        } else {
          // 其他协议可以发链接的用H5卡片发送
          const music = resData.msg[0];
          return [
            { type: 4, url: music.url, title: music.title, thumbUrl: music.picurl, description: music.description }
          ];
        }
      } else {
        if (isMultiple(answer)) {
          const multiList = getMultiList(answer);
          const replys = [];
          for (let item of multiList) {
            item = item.replace(/<\/?.+?\/?>/g, "");
            const reply = await getFormatReply(item, resData.options || [], userInfo, config.puppetType);
            replys.push(...reply);
          }
          return replys;
        } else {
          const replys = getFormatReply(answer, resData.options, userInfo, config.puppetType);
          return replys;
        }
      }
    } else {
      console.log("微信开放对话平台报错：", resData.errcode + resData.errmsg);
    }
  } catch (e) {
    console.log("error", e);
  }
}

export { getTencentOpenReply };
export default {
  getTencentOpenReply
};
