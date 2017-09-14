// 載入
var fs = require('fs'); //檔案系統
var jsonfile = require('jsonfile')
var botSecret = jsonfile.readFileSync('./secret.json'); // bot 資訊
var TelegramBot = require('node-telegram-bot-api'); //api
var bot = new TelegramBot(botSecret.botToken, { polling: true });
var request = require("request"); // HTTP 客戶端輔助工具
var cheerio = require("cheerio"); // Server 端的 jQuery 實作

// log
function log(message, parse_mode = "markdown") {
    console.log(message);
    if (botSecret.logChannelId != undefined)
        for (i in botSecret.logChannelId) bot.sendMessage(botSecret.logChannelId[i], message, { parse_mode: parse_mode });
}

// 啟動成功
var start_time = new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds(); // 機器人啟動時間
log("`[系統]`熊貓貓二號在 " + start_time + " 時啟動成功");

// /start
bot.onText(/\/start/, function(msg) {
    var chatId = msg.chat.id;
    var resp = '哈囉！這裡是熊貓貓二號';
    bot.sendMessage(chatId, resp);
});

// /help
bot.onText(/\/help/, function(msg) {
    var chatId = msg.chat.id;
    var helpCommand = [{
            Command: 'echo',
            Description: "重複講話(可用 HTML)",
        },
        {
            Command: 'addKeyboard',
            Description: "新增鍵盤",
        },
        {
            Command: 'removeKeyboard',
            Description: "移除鍵盤",
        },
        {
            Command: 'viewCombo',
            Description: "查看手賤賤及笨蛋的 Combo，回復別人訊息可取得該使用者的 Combo",
        },
        {
            Command: 'cleanCombo',
            Description: "清除手賤賤及笨蛋的 Combo(無法復原)",
        },
        {
            Command: 'dayoff',
            Description: "查看行政院人事行政總處是否公布放假，支援地名、上班/上課/停班/停課 關鍵字查詢。",
        },
        {
            Command: 'clearDayoffCache',
            Description: "清除上班上課的 cache。",
        },

    ];
    var resp = '';
    for (i of helpCommand) resp += '/' + i.Command + '\n     ' + i.Description + '\n';
    bot.sendMessage(chatId, resp);
});

// 重複講話(HTML)
bot.onText(/\/echo (.+)/, function(msg, match) {
    var resp = match[1];
    bot.sendMessage(msg.chat.id, resp, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
});

// 放假資訊
var dayOffInfoCache = ["", "", true]; // [data, time, alive status (true/false)]

function dayOffInfo(key = 'all', cb) {
    function _getDayoffValue(keyword = key) {
        var resp = "";
        if (keyword == 'all')
            resp = dayOffInfoCache[0];
        else if (keyword.match(/班|課/)) {
            var dayOffInfoCacheSplit = dayOffInfoCache[0].split("\n");
            var searchKeyWord = ['照常上班', '照常上課'];
            if (keyword.match('停班')) searchKeyWord[0] = '停止上班';
            if (keyword.match('停課')) searchKeyWord[1] = '停止上課';

            for (i of dayOffInfoCacheSplit)
                if (i.indexOf(searchKeyWord[0]) != -1 && i.indexOf(searchKeyWord[1]) != -1)
                    resp += i + '\n';
        } else { // 匹配地名
            var dayOffInfoCacheSplit = dayOffInfoCache[0].split("\n");
            for (i of dayOffInfoCacheSplit)
                if (i.indexOf(keyword) != -1) resp += i + '\n';
        }
        (resp == "") ? resp = "找不到資料!": resp += '---\n`最新情報以` [行政院人事行政總處](https://www.dgpa.gov.tw/typh/daily/nds.html) `公告為主`\n' + dayOffInfoCache[1];
        return resp;
    }
    if (dayOffInfoCache[0] == "" || !dayOffInfoCache[2]) {
        request({
                url: "https://www.dgpa.gov.tw/typh/daily/nds.html",
                method: "GET",
                rejectUnauthorized: false
            }, function(e, r, b) {
                dayOffInfoCache = ['', '', true];
                if (e || !b) return;
                var $ = cheerio.load(b);
                var titles = $("body>table:nth-child(2)>tbody>tr>td:nth-child(1)>font");
                var status = $("body>table:nth-child(2)>tbody>tr>td:nth-child(2)>font");
                dayOffInfoCache[1] = $("td[headers=\"T_PA date\"]>p>font").text();
                for (var i = 0; i < titles.length; i++) dayOffInfoCache[0] += '*' + $(titles[i]).text() + '*：' + $(status[i]).text() + '\n'; // Cache
                if (dayOffInfoCache[0].endsWith('：\n')) dayOffInfoCache[0] = dayOffInfoCache[0].slice(0, -2) + '\n';
                cb(_getDayoffValue());
            })
            /* e: 錯誤代碼 */
            /* b: 傳回的資料內容 */
    } else {
        cb(_getDayoffValue());
    }
}
// 放假
bot.onText(/\/dayoff/, function(msg) {
    var keyword = msg.text.split(" ");
    dayOffInfo(keyword[1] ? keyword[1] : 'all',
        cb = result => bot.sendMessage(msg.chat.id, result, { parse_mode: "markdown", reply_to_message_id: msg.message_id }));
});
bot.onText(/\/clearDayoffCache/, function(msg) {
    dayOffInfoCache[2] = false;
    bot.sendMessage(msg.chat.id, 'cache 已清除!', { parse_mode: "markdown", reply_to_message_id: msg.message_id });
});

//鍵盤新增跟移除
bot.onText(/\/addKeyboard/, function(msg) {
    const opts = {
        reply_markup: JSON.stringify({
            keyboard: [
                ['我是笨蛋'],
                ['我手賤賤']
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
            reply_to_message_id: msg.message_id
        })
    };
    bot.sendMessage(msg.chat.id, '鍵盤已新增', opts);
});

bot.onText(/\/removeKeyboard/, function(msg) {
    const opts = {
        reply_markup: JSON.stringify({
            remove_keyboard: true,
            reply_to_message_id: msg.message_id
        })
    };
    bot.sendMessage(msg.chat.id, '鍵盤已移除', opts);
});

bot.onText(/\/cleanCombo/, function(msg) {
    // 將數據設為0
    bitchhand[msg.from.id] = 0;
    stupid[msg.from.id] = 0;
    //輸出
    bot.sendMessage(msg.chat.id, '紀錄已清除', { reply_to_message_id: msg.message_id });
});
bot.onText(/\/viewCombo/, function(msg) {
    if (!msg.reply_to_message) {
        var userID = msg.from.id;
        var userNAME = msg.from.first_name;
    } else {
        var userID = msg.reply_to_message.from.id;
        var userNAME = msg.reply_to_message.from.first_name;
    }
    // 若使用者沒有數據，將數據設為0
    if (!bitchhand[userID]) { bitchhand[userID] = 0; }
    if (!stupid[userID]) { stupid[userID] = 0; }
    //輸出
    resp = userNAME + " 的 Combo 數\n手賤賤：" + bitchhand[userID] + "次\n你笨笨：" + stupid[userID] + "次"
    bot.sendMessage(msg.chat.id, resp, { reply_to_message_id: msg.message_id });
});



bot.on('message', (msg) => {
    // 將所有傳給機器人的訊息轉到頻道
    var SendLog2Ch = "<code>[訊息]</code>" +
        "<code>" +
        "\n 使用者　：" + msg.from.first_name + " @" + msg.from.username +
        "\n 聊天室　：" + msg.chat.title + " | " + msg.chat.id + " | " + msg.chat.type +
        "\n 訊息編號：" + msg.message_id +
        "\n 發送時間：" + msg.date +
        "\n 訊息文字：" + msg.text +
        "</code>"
    log(SendLog2Ch, parse_mode = "HTML");
    // 當有讀到文字時
    if (msg.text != undefined) {
        keywords = ['幹', 'ping', 'ㄈㄓ', '晚安', '喵', '我是笨蛋', '我手賤賤', '怕']
        actions = {
                '幹': function() { bot.sendMessage(msg.chat.id, "<i>QQ</i>", { parse_mode: "HTML", reply_to_message_id: msg.message_id }); },
                'ping': function() { bot.sendMessage(msg.chat.id, "<b>PONG</b>", { parse_mode: "HTML", reply_to_message_id: msg.message_id }); },
                'ㄈㄓ': function() { bot.sendMessage(msg.chat.id, "油", { reply_to_message_id: msg.message_id }); },
                "晚安": function() { bot.sendMessage(msg.chat.id, msg.from.first_name + "晚安❤️", { reply_to_message_id: msg.message_id }); },
                "喵": function() { bot.sendMessage(msg.chat.id, "`HTTP /1.1 200 OK.`", { parse_mode: "markdown", reply_to_message_id: msg.message_id }); },
                '我是笨蛋': function() { count_stupid(msg); },
                '我手賤賤': function() { count_bitchhand(msg); },
                '怕': function() { bot.sendMessage(msg.chat.id, "嚇到吃手手", { parse_mode: "markdown", reply_to_message_id: msg.message_id }); }
            }
            // 如果訊息符合 keywords 裡面的字的話就 actions[關鍵字]
        for (i of keywords)
            if (msg.text.toLowerCase().indexOf(i) === 0) actions[i];
    }
});

// 我是笨蛋跟我手賤賤的記數
var stupid = jsonfile.readFileSync('stupid.owo')
var bitchhand = jsonfile.readFileSync('bitchhand.owo')
jsonedit = false;

function count_stupid(msg) {
    combo = (!stupid[msg.from.id]) ? 1 : combo + 1;
    var resp = "笨笨"
    var combo_count = "\n[" + combo + " Combo]";
    comboMax = [
        [60, ''],
        [40, "你這智障"],
        [20, "笨蛋沒有極限"],
        [4, '']
    ];
    for (i of comboMax) { if (combo > i[0]) { resp = i[1] + combo_count; break; } }
    bot.sendMessage(msg.chat.id, resp, { reply_to_message_id: msg.message_id });
    // 寫入字串
    stupid[msg.from.id] = combo;
    //存檔偵測
    jsonedit = true;
}

function count_bitchhand(msg) {
    combo = (!bitchhand[msg.from.id]) ? 1 : combo + 1;
    var resp = "走開"
    var combo_count = "\n[" + combo + " Combo]";
    comboMax = [
        [60, ''],
        [40, "你這臭 Bitch"],
        [20, "走開，你這賤人"],
        [4, '']
    ];
    for (i of comboMax) { if (combo > i[0]) { resp = i[1] + combo_count; break; } }
    bot.sendMessage(msg.chat.id, resp, { reply_to_message_id: msg.message_id });
    // 寫入字串
    bitchhand[msg.from.id] = combo;
    //存檔偵測
    jsonedit = true;
}
//存檔
var writeFile = function() {
    if (jsonedit) {
        jsonfile.writeFileSync('bitchhand.owo', bitchhand);
        jsonfile.writeFileSync('stupid.owo', stupid);
        //存檔偵測
        jsonedit = false;
    }
};
setInterval(writeFile, 8000);