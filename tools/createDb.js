#!/usr/local/bin/node
'use strict';
var pg = require("pg");
var async = require("async");

var conn_obj = {
    user: "heyjimmy",
    database: "heyjimmy",
}


console.log("creating database...");

pg.connect(conn_obj, function(err, client, done) {
    if (err) throw err;
    async.series([
        // start transaction
        function(callback) {
            client.query("BEGIN", callback);
            console.log('\tdropping old objects');
        // remove old stuff
        }, function(callback) {
            client.query("DROP TABLE IF EXISTS badges CASCADE", callback);
        //TABLES
        }, function(callback) {
            console.log('\tcreating TABLE badges');
            client.query("CREATE TABLE badges ( "
                    + "id               SERIAL PRIMARY KEY, "
                    + "icon             TEXT, "
                    + "user_to          TEXT, "
                    + "user_from        TEXT, "
                    + "channel          TEXT, "
                    + "team             TEXT, "
                    + "timestamp        TIMESTAMP WITH TIME ZONE "
                                     + "NOT NULL DEFAULT CURRENT_TIMESTAMP );",
                callback);
        }
    // error handler
    ], function(err, results) {
        if (err) { done(); throw err; }

        console.log('\tcommitting transaction');
        client.query("COMMIT", function(err, result) {
            done();
            if (err) throw err;
            console.log('database ready');
            process.exit(0);
        });
    });
});
