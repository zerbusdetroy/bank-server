var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Transaction = require('../models/transaction');
var mongoose = require('mongoose');
var utils = require('../utils');
module.exports = function(passport){



    /**
     * Route to add new bankier
     */
    router.post('/bankers', isAuthenticated, hasRole('banker'), addBanker);

    router.post('/bankersession', function(req, res, next) {
        passport.authenticate('bankerlogin', function(error, user, info)
        {
            if(error) return next(error);
            if(!user) return res.send({success:false, message:info.message});
            req.logIn(user, function(err) {
                if(err) return next(err);
                return res.send({success:true, message:"Login successful"});
            });
        })(req, res, next);
    });

    router.post('/clientsession', function(req, res, next) {
        passport.authenticate('accountlogin', function(error, account, info)
        {
            if(error) return next(error);
            if(!account) return res.send({success:false, message:info.message});
            req.logIn(account, function(err) {
                if(err) return next(err);
                return res.send({success:true, message:"Login successful"});
            });
        })(req, res, next);
    });

    router.post('/accounts', isAuthenticated, hasRole('banker'), createAccount);

    router.get('/accounts/:id', isAuthenticated, hasRole('client'), getAccountDetail);

    router.post('/transfer', isAuthenticated, hasRole('client'), doTransfert);

    router.get('/accounts', isAuthenticated, hasRole('banker'), getStats);

    router.delete('/bankersession', function(req, res) {
        req.logout();
        return res.send({success:true, message:"Logout successfully"});
    });

    router.delete('/clientsession', function(req, res) {
        req.logout();
        return res.send({success:true, message:"Logout successfully"});
    });

    router.get('/loginStatus', getLoginStatus);

    return router;
};

var getLoginStatus = function(req, res){
    if(!req.isAuthenticated()){
        return res.json ({status: 'false'});
    }
    else if(req.user && req.user._doc.role === 'client'){
        return res.json ({status: 'client'});
    }
    else if(req.user && req.user._doc.role === 'banker'){
        return res.json ({status: 'banker'});
    }
    else {
        return res.json ({status: 'error'});
    }
}

/**
 * Create a new banker
 * @param req
 * @param res
 */
var addBanker = function(req, res) {
    var user = new User({
        username: req.body.username,
        password: req.body.password,
        role: 'banker'
    });

    user.save(function(err) {
        if (err)
            return res.json({success : false, message: err });

        return res.json({success : true,  message: 'Banker added successfully' });
    });
};

/**
 * Create a new client account
 * @param req
 * @param res
 * @returns {*}
 */
var createAccount = function(req, res) {
    if(!req.body.userName || !req.body.userFirstName || !req.body.balance){
        return res.json({success:false,  message: "Invalid parameters, expect 'userName', 'userFirstName' and 'balance' params" });
    }
    var pwd = Math.random().toString(36).slice(-8);
    var account = new User({
        username: req.body.userName,
        userFirstName: req.body.userFirstName,
        password: pwd,
        role: 'client',
        balance: req.body.balance
    });

    account.save(function(err) {
        if (err)
            return res.json({success:false,  message: err });

        return res.json({success:true,  accountNumber: account._id, accountPassword: pwd });
    });
};

/**
 * Return balance and transactions of the account
 * @param req
 * @param res
 */
var getAccountDetail = function(req, res) {
if (req.user && req.user._doc.role === 'client'){

        var balance = req.user._doc.balance;
        var id = req.user._doc._id.toString();
        Transaction.find({$or : [{"from" : id}, {"to" : id}]}, function (err, docs) {

            return res.json({balance : balance, transactions : docs});
        });

    }
    else
        res.send(500, {success:false, message:"The account has a problem"});
};

/**
 * Transfert money from user account to an other one
 * @param req
 * @param res
 * @returns {*}
 */
var doTransfert = function(req, res) {
    if (req.user && req.user._doc.role === 'client'){

        if(!req.body.amount || !req.body.target ){
            return res.json({success:false,  message: "Expect 'amount' and 'target' params" });
        }

        var balance = req.user._doc.balance;
        var amount = req.body.amount;
        var target_id = req.body.target;
        var sourceAccount = req.user;
        var targetAccount;
        if (!target_id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.json({success: false, message : "Target account isn't valid"});
        }
        var target_object_id = new mongoose.Types.ObjectId(target_id);
        User.findById({ _id: target_object_id }, function (err, account) {
            if (err) { return res.json({success: false, message : "Error occured in bd"}); }

            // No account found with that accountname
            if (!account) { res.json({success: false, message : "Target account doesn't exist"}); }

            if(account.role !== 'client'){ res.json({success: false, message : "Target is not an account"}); }

            targetAccount = account;
            if(amount > balance){
                return res.json({success: false, message : 'Not enough money for transaction'});

            }

            var id = req.user._doc._id.toString();
            var transaction = new Transaction({
                from: id,
                to: target_id,
                amount: amount
            });
            transaction.save(function(err){
                if(err) { return res.json({success: false, message : "Error occured in bd creating transaction"}); }

                sourceAccount.balance = parseFloat(sourceAccount.balance) - parseFloat(amount);

                sourceAccount.save(function(err){
                    if(err) { return res.json({success: false, message : "Error occured in bd saving source account"}); }

                    targetAccount.balance = parseFloat(targetAccount.balance) + parseFloat(amount);

                    targetAccount.save(function(err){
                        if(err) { return res.json({success: false, message : "Error occured in bd saving target account"}); }

                        return res.json({success: true, message : 'Transaction successfully added'});
                    });
                });
            });
        });
    }
    else
        return res.send(500, {success:false, message:"The account has a problem"});
};

/**
 * Get info about :
 * - average balance of accounts
 * - accounts with a balance under 100€
 * @param req
 * @param res
 */
var getStats = function(req, res) {
    User.aggregate([ { $match: { role: "client" } }, { $group: {_id:null, avgBalance: { $avg: "$balance" } } } ], function(err,avg) {
        if(err) return res.json({success : false,  message: err });
        avgBalance = avg[0].avgBalance;

        User.find({ balance: { $lt: 100 }}, function(err, usersUnder100){
            if(err) return res.json({success : false,  message: err });
            var u =[];
            usersUnder100.forEach(function(element, index, array){
                u.push(element._id);
            });
            Transaction.find({amount: { $gt:5000}, date : {$gt: Date.now() - 1000 * 24 * 60 * 60}}, function(err, transactionsMoreThan5000){
                if(err) return res.json({success : false,  message: err });
                var accountsMoreThan5000 = [];
                transactionsMoreThan5000.forEach(function(element, index, array){
                    if(!utils.contains(element.from, accountsMoreThan5000)){
                        accountsMoreThan5000.push(element.from);
                    }
                    if(!utils.contains(element.to, accountsMoreThan5000)){
                        accountsMoreThan5000.push(element.to);
                    }
                });
                return res.json({success : true,  average : avgBalance, accountsUnder100: u, accountsTransactionOver5000: accountsMoreThan5000 });
            });

        });

    });

};


var hasRole = function(role) {
    return function(req, res, next) {
        if (req.user && req.user._doc.role === role)
            next();
        else
            return res.json({success : false,  message: 'Unauthorized role' });
    };
};

// As with any middleware it is quintessential to call next()
// if the user is authenticated
var isAuthenticated = function (req, res, next) {
  if (req.isAuthenticated())
    return next();
  else
    return res.json({success : false,  message: 'You must be logged to access this url' });
}