var SlackBot = require('slackbots');
var db = require('./db');

var Slack = require('slack-node');
apiToken = "xoxp-21319597619-21323087526-21515344294-55cbf9602a";
 
slack = new Slack(apiToken);
 
 // get team name
 // all teams are isolated to their own instance
 // all in same db collection though

var teamId; 
slack.api("team.info", function(err, response) {
  teamId = response.team.id;
});
 
// create a bot 
var bot = new SlackBot({
    token: 'xoxb-21370371409-H0aysEJ2om6hYDVlKY0pw3OV', // Add a bot https://my.slack.com/services/new/bot and put the token  
    name: 'testbot'
});
 
bot.on('start', function() {
    // more information about additional params https://api.slack.com/methods/chat.postMessage 
    var params = {
        icon_emoji: ':cat:'
    };
    
    // define channel, where bot exist. You can adjust it there https://my.slack.com/services  
    //bot.postMessageToChannel('general', 'hello world!', params);
    
    // define existing username instead of 'user_name' 
    //bot.postMessageToUser('jdoltar', 'hello jon!', params); 
    
    // define private group instead of 'private_group', where bot exist 
    //bot.postMessageToGroup('private_group', 'meow!', params); 
});

bot.on('message', function(message) {
    // var params = {
    //     icon_emoji: ':cat:'
    // };
    // bot.postMessageToChannel('general', message.text, params);
    if(message.text) {
        // process message and get a list of jobs, users awarding badges
        var jobs = getJobs(message)
        if(jobs.length) {
            // persist the new data to the database
            jobs.forEach(function(job) {
                db.process(job);
            });
        }
    }
    
});


// parse incoming message and detect if any badges are being given
function getJobs(message) {
    // capture each time user award somebody badges in this message
    var candidatesRegex = /\B<@(?:[a-zA-Z0-9]+)>\:?\s*(?:(?:\s*\:[a-zA-Z0-9_-]+\:\s*)*)/g;
    var candidates = message.text.match(candidatesRegex);

    // if no one awarded someone in this message, just return an empty array
    var results = [];
    if(!candidates) return results;
    candidates.forEach(function(candidate) {
        // separate username and badges from entire capture
        var splitCandidateRegex = /\B<@([a-zA-Z0-9]+)>\:?\s*((?:\s*\:[a-zA-Z0-9_-]+\:\s*)*)/g;
        var match = splitCandidateRegex.exec(candidate);
        if(match) {
            var item = {};
            item.userFrom = message.user;
            item.userTo = match[1];
            // remove white space
            var badgeString = match[2].replace(/\s+/g,'');
            // remove skin tone variations, we don't have css icons for them
            // and they will screw up split in next step
            badgeString = badgeString.replace(/\:\:skin-tone-[0-9]/g, '');
            // remove first and last colon
            badgeString = badgeString.substr(1);
            badgeString = badgeString.substring(0, badgeString.length - 1);
            // split into array of all emoji codes without the colons
            var badges = badgeString.split('::');
            // take individual badge and add meta data to it
            item.badges = [];
            badges.forEach(function(badge) {
                item.badges.push({
                    id: generateId(10),
                    badge: badge,
                    userFrom: message.user,
                    channel: message.channel,
                    timestamp: convertDate(message.ts)
                })
            });
            // push the processed item into results
            results.push(item);
        }
        
    });
    return results;
    
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

function generateId(length)
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    for( var i=0; i < length; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

module.exports.getEmojiList = function() {
    return new Promise(function(resolve, reject){
        slack.api("emoji.list", function(err, emojiList) {
            if(err) reject(err);
            else resolve(emojiList);
        });

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

module.exports.getChannelList = function() {
    return new Promise(function(resolve, reject){
        slack.api("channels.list", function(err, channelList) {
            console.log('channelList', channelList);
            if(err) reject(err);
            else resolve(channelList.channels);
        });

    });
}