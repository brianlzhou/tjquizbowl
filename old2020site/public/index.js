#!/usr/bin/nodejs


// -------------- load packages -------------- //
var cookieSession = require('cookie-session')
var express = require('express')
var simpleoauth2 = require('simple-oauth2');
var app = express();
var hbs = require('hbs');
var request = require('request'); 
var path = require('path');
var keys = require('./keys')
console.log("session started")
// -------------- express initialization -------------- //
app.set('port', process.env.PORT || 8080 );
app.set('view engine', 'hbs');
app.use('/css', express.static(path.join(__dirname, 'css')))
app.use('/img', express.static(path.join(__dirname, 'img')))
app.use('/scss', express.static(path.join(__dirname, 'scss')))
app.use('/js', express.static(path.join(__dirname, 'js')))
app.use('/vendor', express.static(path.join(__dirname, 'vendor')))

app.use(cookieSession({
  name: 'VitkovHill1420',
  keys: ['JanZizka', 'Wagenburg']
}))

console.log("reached");

//--------------- oauth variables ------------ //

var ion_client_id = keys.ion.clientID;
var ion_client_secret = keys.ion.clientSecret;
var ion_redirect_uri = keys.ion.redirectURI;
var oauth2 = simpleoauth2.create({
  client: {
    id: ion_client_id,
    secret: ion_client_secret,
  },
  auth: {
    tokenHost: 'https://ion.tjhsst.edu/oauth/',
    authorizePath: 'https://ion.tjhsst.edu/oauth/authorize',
    tokenPath: 'https://ion.tjhsst.edu/oauth/token/'
  }
});

var authorizationUri = oauth2.authorizationCode.authorizeURL({
    scope: "read",
    redirect_uri: ion_redirect_uri
});

app.get('/', function(req, res){
    console.log(req.session.token)
    if (typeof req.session.token == 'undefined') {
        console.log('no cookie')
        info = {
            uri: authorizationUri,
        }
        res.render("oauth", info);
    }
    else{
        console.log("login successful")
        var access_token = req.session.token.token.access_token;
        var my_ion_request = 'https://ion.tjhsst.edu/api/profile?format=json&access_token='+access_token;
        var user_name = ""
        request.get( {url:my_ion_request}, function (e, r, body) {
            var res_object = JSON.parse(body);
            // from this javascript object, extract the user's name
            user_name = res_object['short_name'];
            var counselor = res_object['counselor'].full_name;
            var picture = res_object['picture']
        });
        info = {
            user: user_name
        }
        res.render('index', info) ;

    }
});

async function callback(req, res){
      if (typeof req.query.code != 'undefined') {
        var theCode = req.query.code 

        var options = {
            code: theCode,
            redirect_uri: ion_redirect_uri,
            scope: 'read'
         };

        var result = await oauth2.authorizationCode.getToken(options);      // await serializes asyncronous fcn call
        var token = oauth2.accessToken.create(result);
        //console.log(token)
        req.session.token = token;
        console.log(req.session.token)
        res.cookie()
        
        res.redirect('https://activities.tjhsst.edu/quizbowl');
    

    } else {
        res.send('no code attached')
    }
}

app.get('/login_worker', callback);


var listener = app.listen(app.get('port'), function() {
  console.log( 'Express server started on port: '+listener.address().port );
});
