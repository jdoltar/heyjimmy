// db test

var mongoose = require('mongoose');
var async = require('async');

mongoose.connect('mongodb://localhost/heyjimmy');

var Schema = mongoose.Schema;

// create a schema
var userSchema = new Schema({
    userId: String,
    badges: [{
        id: String,
        badge: String,
        userFrom: String,
        channel: String,
        timestamp: Date

    }],
    giveCount: Number
});

var User = mongoose.model('User', userSchema);

// var testUser = new User({
//     userId: 'UIEFJGF389',
//     badges: [],
//     giveCount: 0
// });

// testUser.save(function(err) {
//     if(!err) console.log('user added');
// });

// User.update({userId: 'UIEFJGF388'}, {giveCount: 2}, {upsert: true}, function(err, doc) {
//     console.log('entry updated', doc);
// });

// User.find({}, function(err, users) {
//     console.log('there are ' + users.length + ' users', users);
// });

var _public = {};

_public.getLeaders = function() {
    return new Promise(function(resolve, reject) {
        User.find({}, function(err, leaders) {
            if(err) reject(err);
            resolve(leaders);
            console.log('there are ' + leaders.length + ' users', leaders);
        });

    });
}
// get data
//_public.getLeaders();

_public.resetGiveCounts = function() {
    _public.getLeaders().then(function(users) {
            users.forEach(function(user) {
                User.update({userId: user.userId}, {giveCount: 0}, {}, function(err, doc) {
                    
                });

            });
    }, function () {

    });
};

_public.process = function(job) {
    console.log('job', job);

    var userFrom, userTo;

    async.series([
        // get user that is giving badges
        function(callback){
            User.find({userId: job.userFrom}, function(err, users) {
                if(!users.length) {
                    userFrom = new User({
                        userId: job.userFrom,
                        badges: [],
                        giveCount: 0
                    });

                    userFrom.save(function(err) {
                        if(!err) {
                            console.log('user added');
                            callback(null, userFrom);
                        }
                    });
                }
                else {
                    userFrom = users[0];
                    console.log('userFrom', userFrom);
                    callback(null, userFrom);
                }
            });
            
        },
        // get user that is receiving badges
        function(callback){
            
            User.find({userId: job.userTo}, function(err, users) {
                if(!users.length) {
                    userTo = new User({
                        userId: job.userTo,
                        badges: [],
                        giveCount: 0
                    });

                    userTo.save(function(err) {
                        if(!err) {
                            console.log('user added');
                            callback(null, userTo);
                        }
                    });
                }
                else {
                    userTo = users[0];
                    console.log('userTo', userTo);
                    callback(null, userTo);
                }
            });
        },
        // process
        function(callback){

            for(var i = 0; i < job.badges.length; i++) {
                if(userFrom.giveCount < 50000) {
                    userTo.badges.push(job.badges[i]);
                    userFrom.giveCount++;
                }
                else break;
                
            }
            callback(null, '');
        },
        // save userTo
        function(callback){

            User.update({userId: userTo.userId}, userTo, {upsert: true}, function(err, doc) {
                callback(null, '');
            });

            
        },
        // save userFrom
        function(callback){
            User.update({userId: userFrom.userId}, userFrom, {upsert: true}, function(err, doc) {
                callback(null, '');
            });

        },
        // list users
        function(callback){

            User.find({}, function(err, users) {
                console.log('there are ' + users.length + ' users', users);
                callback(null, '');
            });

        }
    ],
    // optional callback
    function(err, results){
        // results is now equal to ['one', 'two']
    });
};


module.exports = _public;