// Jon Doltar
// 2016-02

'use strict';

var pg = require('pg');
var async = require('async');
var config = require('../config');

var conn_obj = {
    user: config.datebaseUserName,
    database: config.databaseName,
};

var db = {};


// Query helper function
//      timestamp       only fetch bdages given after this
//      team            only fetch badges in this team
//      icon            only fetch badges of this icon
//      user_from       only fetch badges awarded by this user
// This returns a unique list of users sorted by how many badges they have
// only the badge count is returned, need to query for badges for each user
db.generateWhereClause= function(params) {
    if (!params) params = {};

    // build query query
    var args = [];
    var filter = '';
    if (params.timestamp) {
        args.push(params.timestamp);
        filter += 'timestamp > $' + args.length;
    }
    if (params.team) {
        if (filter) filter += " AND ";
        args.push(params.team);
        filter += 'team = $' + args.length;
    }
    if (params.icon) {
        if (filter) filter += " AND ";
        args.push(params.icon);
        filter += 'icon = $' + args.length;
    }
    if (params.userFrom) {
        if (filter) filter += " AND ";
        args.push(params.userFrom);
        filter += 'user_from = $' + args.length;
    }
    if (params.userTo) {
        if (filter) filter += " AND ";
        args.push(params.userTo);
        filter += 'user_to = $' + args.length;
    }
    if (filter) filter = 'WHERE ' + filter;

    return {
        filter: filter,
        args: args
    }

};

// Get count of all badges given today by user
db.checkGiveCount = function(badge) {
    return new Promise(function(resolve, reject) {
        // get last midnight
        var date = new Date();
        date.setHours(0,0,0,0);

        // get a client from the connection pool
        pg.connect(conn_obj, function(err, client, done) {
            if (err) return reject(err);
            client.query('SELECT user_from AS "userFrom" '
                    + 'FROM badges WHERE timestamp > $1', [date],
                function(err, result) {
                    done();
                    if (!err) {
                        // if user is allowed to give more badges
                        // then resolve the badge
                        if(result.rowCount < 5) {
                            return resolve(badge);
                        }
                        // otherwise resolve empty object so
                        // next function in chain will do nothing
                        else return resolve(undefined);
                        
                    }
                    else return reject(err);
                }
            );
        });
    });
};

// Save an individual badge to the database
db._saveBadge = function(badge) {
    return new Promise(function(resolve, reject) {
        // check if badge is defined. If a badge is undefined then
        // that means the users give count has been exceeded
        if(badge === undefined) return resolve();
        // get a client from the connection pool
        pg.connect(conn_obj, function(err, client, done) {
            if (err) return reject(err);
            // run the update
            client.query('INSERT INTO badges (icon, user_to, user_from, ' 
                    + 'channel, team) VALUES ($1, $2, $3, $4, $5) '
                    + 'RETURNING *',
                    [ badge.icon, badge.userTo, badge.userFrom,
                                             badge.channel, badge.team ],
                function(err, result) {
                    done();
                    if (err) return reject(err);
                    else return resolve(result.rows[0]);
                }
            );
        });
    });
};

// Save an individual badge to the database but checks give count first
db.saveBadge = function(badge) {
    return db.checkGiveCount(badge).then(db._saveBadge);
};


// Get leaders. Args as properties:
//      timestamp       only fetch bdages given after this
//      team            only fetch badges in this team
//      icon            only fetch badges of this icon
//      user_from       only fetch badges awarded by this user
// This returns a unique list of users sorted by how many badges they have
// only the badge count is returned, need to query for badges for each user
db.getBadgeCountLeaders = function(params) {
    return new Promise(function(resolve, reject) {
        // generate where clause with params given
        var where = db.generateWhereClause(params);

        // get a client from the connection pool
        pg.connect(conn_obj, function(err, client, done) {
            if (err) return reject(err);
            client.query('SELECT user_to AS "userTo", COUNT(user_to) '
                + 'FROM badges ' + where.filter + 
                ' GROUP BY user_to ORDER BY COUNT DESC ', where.args,
                function(err, result) {
                    done();
                    if (err) return reject(err);
                    else return resolve(result.rows);
                }
            );
        });
    });
};

// Get badges. Args as properties:
//      timestamp       only fetch bdages given after this
//      team            only fetch badges in this team
//      icon            only fetch badges of this icon
//      user_from       only fetch badges awarded by this user
// This returns a unique list of users sorted by how many badges they have
// only the badge count is returned
db.getBadges= function(params) {
    return new Promise(function(resolve, reject) {
        // generate where clause with params given
        var where = db.generateWhereClause(params);

        // get a client from the connection pool
        pg.connect(conn_obj, function(err, client, done) {
            if (err) return reject(err);
            client.query('SELECT id, icon, user_to AS "userTo", '
                    + 'user_from AS "userFrom", channel, team, '
                    + 'timestamp FROM badges ' + where.filter 
                    + ' ORDER BY timestamp DESC ', where.args,
                function(err, result) {
                    done();
                    if (err) return reject(err);
                    else return resolve(result.rows);
                }
            );
        });
    });
};

// Get Leaders. Args as properties:
//      timestamp       only fetch bdages given after this
//      team            only fetch badges in this team
//      icon            only fetch badges of this icon
//      user_from       only fetch badges awarded by this user
// This returns a unique list of users sorted by how many badges they have
// It includes all the badges they have
db.getLeaders = function(params) {
    return new Promise(function(resolve, reject) {
        var leaders;

        async.series([
            // get badge count leaders
            function(callback) {
                db.getBadgeCountLeaders(params)
                    .then(function(badgeCountLeaders) {
                        leaders = badgeCountLeaders;
                        callback(null, badgeCountLeaders);
                    }, function(err) {
                        callback(err);
                    });
            },
            //get badges for each leader
            function(callback) {
                async.each(leaders, function(leader, eachCallback) {
                    // copy params object
                    var _params = JSON.parse(JSON.stringify(params) || '{}');
                    // modify local params with leader
                    _params.userTo = leader.userTo;

                    // get the badges for this leader
                    db.getBadges(_params)
                        .then(function(badges) {
                            leader.badges = badges;
                            eachCallback(null, badges);
                        }, function(err) {
                            eachCallback(err);
                        })
                        //TODO will this catch reject() callback as well?
                        .catch(function() {
                            eachCallback(err);

                        });
                }, 
                // async.each is finished
                function(err) {
                    if(!err) callback(null, leaders);
                    else callback(err);
                });
            }
        ],
        // async.series is finished
        function(err, results) {
            if(!err) resolve(leaders);
            else reject(err);
        });
    });
};


module.exports = db;