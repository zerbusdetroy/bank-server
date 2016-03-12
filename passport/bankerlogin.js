var LocalStrategy   = require('passport-local').Strategy;
var User = require('../models/user');
var bCrypt = require('bcrypt-nodejs');

/**
 * Strategy for banker login
 * The test is on the username, password and role.
 * Note use of findOne on username while username isn't unique. We can't set username unique because
 * it's used for clients too, but we have only one banker so it's not a problem.
 * If it was possible to have some bankers with same username we would have to change the model
 * @param passport
 */
module.exports = function(passport){

    passport.use('bankerlogin', new LocalStrategy(

        function(username, password, callback) {
            var error = 'There is no banker associated with this password';
            User.findOne({ $and: [{ "username": username }, {"role" : "banker"}]}, function (err, user) {
                if (err) { return callback(err); }

                // No user found with that username
                if (!user) { return callback(error, false); }

                // Make sure the password is correct
                user.verifyPassword(password, function(err, isMatch) {
                    if (err) { return callback(err); }

                    // Password did not match
                    if (!isMatch) { return callback(error, false); }

                    // Success
                    return callback(null, user);
                });
            });
        }
    ));

};