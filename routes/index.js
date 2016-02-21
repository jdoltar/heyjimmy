var express = require('express');
var router = express.Router();
var path = require('path');
var db = require('../modules/db-pg');
var bot = require('../modules/bot');

/* GET home page */
router.get('/', function(req, res, next) {
    res.sendFile(path.resolve('app/home.html'));
});
//


/* GET users and badges */
router.get('/leaders', function(req, res, next) {
    db.getLeaders().then(function(leaders) {
        console.log('sending leaders', leaders);
        res.send(leaders);

    }, function(err) {
        console.log('could get leaders', err);
    });
});

/* GET badges */
router.get('/badges', function(req, res, next) {

    console.log('getting badges - route');
    db.getBadges().then(function(badges) {
        res.send(badges);

    }).catch(function(err) {
        console.log('could get badges', err);
        next(err);
    });;
});

/* GET custom emoji list */
router.get('/emoji-list', function(req, res, next) {
    bot.getEmojiList().then(function(emojiList) {
        res.send(emojiList);

    }, function(err) {

    });
});


/* GET user list */
router.get('/user-list', function(req, res, next) {
    bot.getUserList().then(function(emojiList) {
        res.send(emojiList);

    }, function(err) {

    });
});


/* GET channel list */
router.get('/channel-list', function(req, res, next) {
    bot.getChannelList().then(function(channelList) {
        res.send(channelList);

    }, function(err) {

    });
});

/* GET channel list */
router.get('/givecount', function(req, res, next) {
    db.getGiveCount('U0M9H2KFG').then(function(giveCount) {
        res.send(giveCount);

    }, function(err) {

    });
});


module.exports = router;
