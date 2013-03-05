
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
        ldesc: 'string'
      }),
      
    };
    schema.user = mongoose.Schema({
      username: 'string',
      password: 'string',
      email:'string',
      id:'ObjectId',
      human:'string',
      cwl: 'ObjectId',
      admin: 'boolean'
    });
    User = mongoose.model('User',schema.user),
    Language = mongoose.model('Language',schema.lang);

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
    // set up the 'current working language' local variable
    if(typeof(req.user)!=='undefined') {
      // the second check invalidates the cache in cases where the user has logged out or changed languages
      if(typeof(req.session.lang) === 'undefined' || req.session.lang._id != req.user.cwl) {
        Language.findOne({_id:req.user.cwl},function(err,cwl) {
          if(err) { console.log('Mongoose error: ' + err); }
          req.session.lang = cwl;
          console.log('session language cache miss');
          res.locals.cwl = cwl;
        });
      } else {
        console.log('session language cache hit');
        res.locals.cwl = req.session.lang;
      }
      // also set up the 'user' variable which needs to be available everywhere
      res.locals.user = req.user;
    }
    next();
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
