

/**
 * This script is used to create the banker if it doesn't exist in db
 */

var mongoose = require('mongoose');
var dbConfig = require('./db');

// Connect to DB
mongoose.connect(dbConfig.url);

var User = require('./models/user');


var user = new User({
    username: 'banker',
    password: 'banker',
    role: 'banker'
});

user.save(function(err) {
    if (err)
        console.log('Error during BDD access, check mongo db is up');
    console.log('Banker added successfully. Username : banker, password : banker');
});