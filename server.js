// Load required packages
var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');

var dbConfig = require('./db');
var mongoose = require('mongoose');

var conf = require('./conf.js');

// Connect to DB
mongoose.connect(dbConfig.url);
var port = 8888;

// Create our Express application
var app = express();


// Use the body-parser package in our application
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

// Initialize session
var expressSession = require('express-session');

app.use(expressSession({secret: 'ALittleBitOfSecret',
    proxy: true,
    resave: true,
    saveUninitialized: true}));

// Add headers
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', conf.authorizedUrl);

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

// Use the passport package in our application
app.use(passport.initialize());
app.use(passport.session());

// Initialize Passport
var initPassport = require('./passport/init');
initPassport(passport);



// use router
var router = require('./controllers/index')(passport);
app.use('/api', router);

// Initial route
app.use('/', function(req, res){
    return res.send({success:true, message:"REST appli up"});
});

// Start the server
app.listen(port);
console.log('Server started on port '+port);
