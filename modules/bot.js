var Slack = require('slack-node');
var SlackBot = require('slackbots');
var Botkit = require('botkit');
var db = require('./db');
var request = require('request');
var config = require ('../config');
var fs = require('fs');

 
var slack = new Slack(config.slackApiToken);

var teamId; 
slack.api("team.info", function(err, response) {
  teamId = response.team.id;
});
 
// create a bot 
var bot = new SlackBot({
    token: config.slackBotToken, // Add a bot https://my.slack.com/services/new/bot and put the token  
    name: config.slackBotName
});

var botId;
 
bot.on('start', function() {
    // more information about additional params https://api.slack.com/methods/chat.postMessage 
    var params = {
        icon_emoji: ':jimmy:'
    };

    bot.getUser('heyjimmy').then(function(user) {
        botId = user.id;
        console.log('botId', botId);
    });
    
});

bot.on('message', function(message) {

    // check if message has text and is not a replay (reply_to)
    if(message.text && message.reply_to === undefined) {
        // process message and get a list of jobs, users awarding badges
        var badges = extractBadges(message)
        if(badges.length) db.saveBadges(badges);        
    }
    
});

// parse incoming message and detect if any badges are being given
function extractBadges(message) {
    console.log('message', message);
    // capture each time user award somebody badges in this message
    var candidatesRegex = /\B<@(?:[a-zA-Z0-9]+)>\:?\s*(?:(?:\s*\:[a-zA-Z0-9_-]+\:\s*)+)/g;
    var candidates = message.text.match(candidatesRegex);

    // if no one awarded someone in this message, just return an empty array
    var badges = [];
    if(!candidates) return badges;
    candidates.forEach(function(candidate) {
        // separate username and badges from entire capture
        var splitCandidateRegex = /\B<@([a-zA-Z0-9]+)>\:?\s*((?:\s*\:[a-zA-Z0-9_-]+\:\s*)+)/g;
        var match = splitCandidateRegex.exec(candidate);
        if(match) {
            // remove white space from badge string
            var badgeString = match[2].replace(/\s+/g,'');
            // remove skin tone variations, we don't have css icons for them
            // and they will screw up split in next step
            badgeString = badgeString.replace(/\:\:skin-tone-[0-9]/g, '');
            // remove first and last colon
            badgeString = badgeString.substr(1);
            badgeString = badgeString.substring(0, badgeString.length - 1);
            // split into array of all emoji codes without the colons
            var badgeIcons = badgeString.split('::');
            // take individual emoji icons and create badge objects
            badgeIcons.forEach(function(badge) {
                //badge.icon, badge.userTo, badge.userFrom, badge.channel, badge.team
                badges.push({
                    icon: badge,
                    userTo: match[1],
                    userFrom: message.user,
                    channel: message.channel,
                    team: teamInfo.id
                })
            });
        }
        
    });
    return badges;
    
}

// convert slack time into js time
// ex slackTime: "1355517536.000001"
// first part is unix time, second part is message ordering
function convertDate(slackTime) {

    var unixTime = slackTime.substring(0, slackTime.indexOf('.'));
    var date =  new Date(Number(unixTime) * 1000);
    // if we failed to convert date, just use now, close enough
    return date || new Date();
}

function generateId(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    for( var i=0; i < length; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function getTeamInfo() {
    return new Promise(function(resolve, reject){
        slack.api("team.info", function(err, teamInfo) {
            if(err) reject(err);
            else resolve(teamInfo.team);
        });

    });
}
var teamInfo;
getTeamInfo().then(function(info) {
    teamInfo = info;
});

module.exports.getCustomEmojiList = function() {
    return new Promise(function(resolve, reject){
        slack.api("emoji.list", function(err, emojiList) {
            if(err) reject(err);
            else resolve(emojiList);
        });

    });
}

var cssEmojiList;
module.exports.getCssEmojiList = function() {
    return new Promise(function(resolve, reject) {
        // only compute list once. if we already did, send that
        if (cssEmojiList) return resolve(cssEmojiList);

        // css file location
        var filename = 'app/styles/emoji-apple-72.css';

        // get emoji css file
        //request(url, function(error, response, body) {
        fs.readFile(filename, 'utf8', function(err, css) {
            // capture each time user award somebody badges in this message
            var emojiCodeRegex = /\.em\-a\-([a-zA-Z-0-9_]+)\{/g;

            // find successive matches and push capture group to array
            var matches  = [];
            while ((result = emojiCodeRegex.exec(css)) !== null) {
                matches.push(result[1]);
            }
            cssEmojiList = matches;
            resolve(cssEmojiList);
        });


    });
}

module.exports.getEmojiLists = function() {
    return Promise.all([module.exports.getCssEmojiList(), 
                 module.exports.getCustomEmojiList()])
    .then(function(result) { 
        console.log('css emojis found', result[0].length);
        return Promise.resolve({
            standard: result[0],
            custom: result[1].emoji
        });
    }, function(reason) {
        console.log(reason);
    });
}


module.exports.getUserList = function() {
    return new Promise(function(resolve, reject){
        slack.api("users.list", function(err, userList) {
            if(err) reject(err);
            else resolve(userList.members);
        });

    });
}
var userList;
var botId;
module.exports.getUserList().then(function(data) {
    userList = data;
});

module.exports.getChannelList = function() {
    return new Promise(function(resolve, reject){
        slack.api("channels.list", function(err, channelList) {
            if(err) reject(err);
            else resolve(channelList.channels);
        });

    });
}


var controller = Botkit.slackbot({
 debug: false
});

controller.spawn({
  token: config.slackBotToken
}).startRTM(function(err) {
  if (err) {
    throw new Error(err);
  }
});


var getRandomItem = function(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

controller.hears(['leaderboard'],
            ['direct_message','direct_mention','mention'],
            function(bot,message) {

    bot.reply(message,"http://heyjimmy.codeletting.com/");

});

var danceGifs = [
    'https://media.giphy.com/media/2iODRXAkSdX0s/giphy.gif',
    'https://media.giphy.com/media/F5DgwU1yJAGM8/giphy.gif',
    'https://media.giphy.com/media/VgYKTviMUEhPy/giphy.gif',
    'https://media.giphy.com/media/iNUq5rs9KSrFm/giphy.gif',
    'https://media.giphy.com/media/6RyseGuz5TNiE/giphy.gif'
];

controller.hears(['dance'],
            ['direct_message','direct_mention','mention'],
            function(bot,message) {

    bot.reply(message, getRandomItem(danceGifs));

});

// the pattern input is a string of a regex and not a regex
// so that means we have to escape the escape character so
// it shows up literally on the string and thus is interpretted
// by the regex as the escape character (only one of them)
controller.hears(['\\bwhat\\b.*\\bwear\\b'],
            ['direct_message','direct_mention','mention'],
            function(bot,message) {

    bot.reply(message, 'jeans and an Advisor LaunchPLAID shirt, duh');

});

controller.hears(['\\bhow much\\b.*\\brent\\b'],
            ['direct_message','direct_mention','mention'],
            function(bot,message) {

    bot.reply(message, 'http://giphy.com/gifs/1BXa2alBjrCXC');
    bot.reply(message, 'too much');
	

});


controller.hears(['open the pod bay doors'],
            ['direct_message','direct_mention','mention', 'ambient'],
            function(bot,message) {

    bot.reply(message, 'I\'m sorry, Dave. I\'m afraid I can\'t do that.');

});

controller.hears(['joke'],
            ['direct_message','direct_mention','mention'],
            function(bot,message) {

    bot.reply(message, 'I was going to tell you a joke about pizza but never mind, it\'s too cheesy');

});


controller.hears(['pizza'],['direct_message','mention', 'direct_mention'],function(botk,message) {
  botk.startConversation(message, askFlavor);
});

askFlavor = function(response, convo) {
  convo.ask("pizza eh???? what kind do you want?", function(response, convo) {
    convo.say("awesome");
    convo.say("great choice");
    askSize(response, convo);
    convo.next();
  });
}
askSize = function(response, convo) {
  convo.ask("what size do you want?", function(response, convo) {
    convo.say("dope")
    askWhereDeliver(response, convo);
    convo.next();
  });
}
askWhereDeliver = function(response, convo) { 
  convo.ask("where do you want it delivered?", function(response, convo) {
    convo.say("ok! coming right up!");
    convo.say(":p-pizza:");
    convo.next();
  });
}
