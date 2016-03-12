var mongoose = require('mongoose');

/**
 * Represent a transaction with its source, target, date and amount
 */
var TransactionSchema = new mongoose.Schema({
    from: String,
    to: String,
    date: {type:Date, default: Date.now}  ,
    amount : Number
});

module.exports = mongoose.model('Transaction',TransactionSchema);