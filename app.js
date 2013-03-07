
/**
 * Module dependencies.
 */

var express = require('express')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , mongoose = require('mongoose')
  , http = require('http')
  , path = require('path');

var app = express();


// mongoose setup
mongoose.connect('localhost','child');
var schema = {
      lang : mongoose.Schema({
        id: 'objectId',
        owner: 'objectId',
        name: 'string',
        // languages marked as 'official' are thunked to the top of search results
        official: 'boolean',
        sdesc: 'string',
        ldesc: 'string',
        dict: 'objectId'
      }),
    };
    schema.dict = mongoose.Schema({
        language: 'objectId',
        words: [{
          word:'string',
          classification:'string',
          definition:'string',
          tags:[String]
        }]
    });
    schema.user = mongoose.Schema({
      username: 'string',
      password: 'string',
      email:'string',
      id:'ObjectId',
      human:'string',
      cwl: 'ObjectId',
      admin: 'boolean'
    });
    Language = mongoose.model('Language',schema.lang),
    User = mongoose.model('User',schema.user),
    Dictionary = mongoose.model('Dictionary',schema.dict);

// must be included after mongoose setup
var routes = require('./routes')

app.configure(function(){
  app.set('port', process.env.PORT || 2031);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.locals.pretty = true;
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({secret:'foobar'}));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(function(req,res,next) {
    if(typeof req.user !== 'undefined') {
      // set up the 'current working language' local variable
      if(typeof(req.session.lang) === 'undefined' || req.session.lang._id != req.user.cwl) {
        Language.findOne({_id:req.user.cwl},function(err,cwl) {
          if(err) { console.log('Mongoose error: ' + err); }
          else {
            console.log('session language cache miss');
            req.session.lang = app.locals.cwl = cwl;
          }
          next();
        });
      } else {
        console.log('session language cache hit');
        app.locals.cwl = req.session.lang;
        next();
      }
    } else {
      next(); // just pass it straight on if user is undefined
    }
  });
  app.use(function(req,res,next) {
    if(typeof req.user !== 'undefined') {
      // great, now that we have a language, let's grab the relevant dictionary from mongo
      if(typeof(req.session.dict) === 'undefined' || req.session.dict == null || req.session.dict.lang != req.user.cwl) {
        Dictionary.findOne({_id:req.user.cwl},function(err,dict) {
          if(err) { console.log('Mongoose error: ' + err); }
          else {
            if(!dict) {
              console.log('session dictionary cache double miss');
              app.locals.e = 'Dictionary not found';
            } else {
              console.log('session dictionary cache miss');
              req.session.dict = app.locals.dict = dict;
            }
          }
          app.locals.user = req.user;
          // NOW we move on with the middleware chain
          next();
        });
      } else {
        console.log('session dictionary cache hit');
        app.locals.dict = req.session.dict;
        app.locals.user = req.user;
        next();
      }
    } else {
      next(); // if user undefined, proceed
    }
  });
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// passport setup
passport.use(new LocalStrategy(
  function(username,password,done) {
    User.findOne({username:username,password:password},function(err,user) {
      done(err,user);
    });
  }
));

passport.serializeUser(function(user,done) {
  done(null,user._id);
});

passport.deserializeUser(function(id,done) {
  User.findOne({_id:id},function(err,user) {
    done(err,user);
  });
});

app.get('/', routes.index);

app.get('/login',routes.login);

app.get('/loginfailed',function(req,res) {
  res.send('false');
});

app.post('/login',passport.authenticate('local',{failureRedirect:'/loginfailed'}),routes.login);

app.get('/logout',function(req,res) {
  req.logout();
  res.redirect('/');
});

app.post('/change',routes.changelang);

app.get('/change',routes.changelang);

app.get('/search',routes.search);

app.post('/search',routes.results);

app.get('/create',routes.createlang);

app.post('/create',routes.postcreate);

app.get('/debug',routes.debug);

app.get('/register',routes.register);

app.post('/register',routes.newuser);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
