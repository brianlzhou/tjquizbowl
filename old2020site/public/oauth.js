#!/usr/bin/nodejs

// -------------- load packages -------------- //
var cookieSession = require('cookie-session')
var express = require('express')
var simpleoauth2 = require("simple-oauth2");
var app = express();
var request = require('request');
var hbs = require('hbs');
var path = require('path');
// -------------- express initialization -------------- //

// Here, we set the port (these settings are specific to our site)
app.set('port', process.env.PORT || 8080 );
app.set('view engine', 'hbs');
app.use('/js', express.static(path.join(__dirname, 'js')))
app.use('/css', express.static(path.join(__dirname, 'css')))
app.use('/img', express.static(path.join(__dirname, 'img')))
// These are keys that we'll use to encrypt our cookie session.
// If you open the developer tools, you'll find taht we only have 
// one cookie (named session). All of the subparameters that we add
// within the cookie (like the OAUTH token, and the javascript variable 
// name we give the token) will be embedded through double encryption 
// usiung these keys
app.use(cookieSession({
  name: 'kosovofield1389',
  keys: ['PrinceLazar', 'VukBrankovic']
}))


// -------------- variable initialization -------------- //

// These are parameters provided by the authenticating server when
// we register our OAUTH client. 
//
//  YOU DON'T JUST MAKE THESE UP, THEY WERE PROVIDED AS PART OF CONFIGURATION AT:
//     https://ion.tjhsst.edu/oauth/applications/
//
//  n.b.
// -- The client ID is going to be public
// -- The client secret is super top secret. KEEP IT SECRET
// -- The redirect uri should be some intermediary 'get' request that 
//     you write in which you assign the token to the session. 

var ion_client_id = '2KZ1yTmSYZqctBQlhMqe6yNE9GespUgs8NPDMdJR';
var ion_client_secret = 'kgqrgFJmDVMMlSQjdB7NwfsTk1RcH7hmp9JMGVdDAdVuoMRY3c6ZbLQ7AmrvfXCZ9mHF41z8Gd6x9aOeivP05WD513CumBibL2DSWGQrTh1PkSAtujdbjQLwmFSETp54';
var ion_redirect_uri = 'https://activities.tjhsst.edu/quizbowl/login_worker';    //    <<== you choose this one


// Here we create an oauth2 variable that we will use to manage out OAUTH operations
// DO NOT MODIFY THIS OBJECT. IT IS CONFIGURED FOR TJ

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


// [WHITESPACE FOR PRINTING]


// This is the link that will be used later on for logging in. This URL takes
// you to the ION server and asks if you are willing to give read permission to ION.

var authorizationUri = oauth2.authorizationCode.authorizeURL({
    scope: "read",
    redirect_uri: ion_redirect_uri
});


// -------------- express 'get' handlers -------------- //

app.get('/', function (req, res) {


    // Here we ask if the token key has been attached to the session...
    if (typeof req.session.token == 'undefined') {
        // ...if the token does not exist, this means that the user has not logged in
    
        // THIS GENERATES AN HTML PAGE BY COMBINING STRINGS.
        //   IF YOU DO THIS IN YOUR ACTUAL PAGE, I WILL BE SAD.
        // -----------REPLACE WITH HANDLEBARS-----------
        info = {
            uri: authorizationUri
        }
        console.log(info.uri)
        res.render("oauth_test", info);


    } else {
        // ... if the user HAS logged in, we'll send them to a creepy page that knows their name

        // Now, we create a personalized greeting page. Step 1 is to 
        // ask ION for your name, which means conducting a request in the
        // background before the user's page is even rendered.

        // To start the process of creating an authenticated request, 
        // I take out the string 'permission slip' from 
        // the token. This will be used to make an ION request with your
        // credentials
        var access_token = req.session.token.token.access_token;
        
        // Next, construct an ION api request that queries the profile using the 
        // individual who has logged in's credentials (it will return) their
        // profile
        var my_ion_request = 'https://ion.tjhsst.edu/api/profile?format=json&access_token='+access_token;

        // Perform the asyncrounous request ...
        // [seems like a PERFECT place for middleware!!!]
        request.get( {url:my_ion_request}, function (e, r, body) {
            // and here, at some later (indeterminite point) we land.
            // Note that this is occurring in the future, when ION has responded
            // with our profile.

            // The response from ION was a JSON string, so we have to turn it
            // back into a javascript object
            //res.send(body)
            var res_object = JSON.parse(body);
            // from this javascript object, extract the user's name
            var user_name = res_object['short_name'];
            var counselor = res_object['counselor'].full_name;
            var picture = res_object['picture']
			// [WHITESPACE FOR PRINTING]




            // Construct a little page that shows their name
            // -----------REPLACE WITH HANDLEBARS-----------
            //res.send(body)
            var output_string = "";
            output_string += "<!doctype html>\n";
            output_string += "<html><head></head><body>\n";
            output_string += "<p>Hello "+user_name+"!</p>\n";
            output_string += "<p>Your counselor is "+counselor+"!</p>\n";
            output_string += "<image src=\"" + picture +"\"></image>\n";
            output_string += "</body></html>";

            // send away the output
            res.send(output_string);
        });
    }
});


// -------------- intermediary login helper -------------- //

// The name '/login' here is not arbitrary!!! The location absolutely
// must match ion_redirect_uri for OAUTH to work!
//
//  HOWEVER - THE USER WILL NEVER ACTUALLY TYPE IN https://user.tjhsst.edu/pckosek/login_worker!!!!
//    This is a hidden endpoint used for authentication purposes. It is used as 
//    an intermediary worker that ultimately redirects authenticaed users

app.get('/login_worker', async function (req, res) {

    // The whole purpose of this 'get' handler is to attach your  token to the session. 
    // Your users should not be going here if they are not trying to login in - and you
    // should not be attaching your login token in any other methods (like the default landing page)

    // Step one. Assuming we were send here following an authentication and that there is a code attached.
    if (typeof req.query.code != 'undefined') {
        
        var theCode = req.query.code; 

        var options = {
            code: theCode,
            redirect_uri: ion_redirect_uri,
            scope: 'read'
         };

        var result = await oauth2.authorizationCode.getToken(options);      // await serializes asyncronous fcn call
        var token = oauth2.accessToken.create(result);

        req.session.token = token;

        console.log(req.session.token);

        res.cookie();

        res.redirect('./');

    } else {
        res.send('no code attached');
    }
});




// -------------- express listener -------------- //
var listener = app.listen(app.get('port'), function() {
  console.log( 'Express server started on port: '+listener.address().port );
});
