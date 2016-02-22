var express = require('express');
var router = express.Router();
var path = require('path');
var db = require('../modules/db');
var bot = require('../modules/bot');

/* GET home page */
router.get('/', function(req, res, next) {
    res.sendFile(path.resolve('app/home.html'));
});
//


/* GET users and badges */
router.get('/leaders', function(req, res, next) {
    var timestamp ;
    if(req.query.timestamp) timestamp = new Date(req.query.timestamp);
    db.getLeaders({
        timestamp: timestamp,
        icon: req.query.icon,
        userTo: req.query.userTo,
        userFrom: req.query.userFrom,
        team: req.query.team
    })
        .then(function(data) {
            res.send(data);

        }, function(err) {
            console.log('could not get leaders', err);
        });
});

/* GET badges */
router.get('/badges', function(req, res, next) {

    db.getBadges().then(function(data) {
        res.send(data);

    }).catch(function(err) {
        console.log('could not get badges', err);
        next(err);
    });;
});

/* GET custom emoji list */
router.get('/emoji-list', function(req, res, next) {
    bot.getEmojiList().then(function(data) {
        res.send(data);

    }, function(err) {
        console.log('could not get emoji list', err);

    });
});


/* GET user list */
router.get('/user-list', function(req, res, next) {
    bot.getUserList().then(function(data) {
        res.send(data);

    }, function(err) {
        console.log('could not get user list', data);

    });
});


/* GET channel list */
router.get('/channel-list', function(req, res, next) {
    bot.getChannelList().then(function(data) {
        res.send(data);

    }, function(err) {
        console.log('could not get channel list', data);
    });
});


module.exports = router;
