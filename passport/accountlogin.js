var bCrypt = require('bcrypt-nodejs');
var User = require('../models/user');
var mongoose = require('mongoose');
var LocalStrategy   = require('passport-local').Strategy;

/**
 * Strategy for client login
 * Clients must login with account id (i.e. user document id in our model)
 * @param passport
 */
module.exports = function(passport){

    passport.use('accountlogin', new LocalStrategy(

        function(account_id, password, callback) {
            var error = 'There is no account associated with this password';
            if (!account_id.match(/^[0-9a-fA-F]{24}$/)) {
                // The id gaven hasn't expected format

                return callback(error, false);
            }
            var id = new mongoose.Types.ObjectId(account_id);
            User.findOne({ $and: [{ "_id": id }, {"role" : "client"}]}, function (err, account) {
                if (err) { return callback(err); }

                // No account found with that accountname
                if (!account) { return callback(error, false); }

                // Make sure the password is correct
                account.verifyPassword(password, function(err, isMatch) {
                    if (err) { return callback(err); }

                    // Password did not match
                    if (!isMatch) { return callback(error, false); }

                    // Success
                    return callback(null, account);
                });
            });
        }
    ));

};