var mongoose = require('mongoose');

var schema = {
      dict : mongoose.Schema({
        language: 'objectId',
        words: [{word:'string',classification:'string',definition:'string',tags:[String]}]
      })
    },
    Language = mongoose.model('Language'),
    User = mongoose.model('User'),
    Dictionary = mongoose.model('Dictionary',schema.dict);

// GET home (or dash if logged in)
exports.index = function(req,res) {
  if(req.user) {
    res.render('dash', {title: 'Dashboard'});
  } else {
    res.render('index', { title: 'Home'});
  }
};

// GET /login
exports.login = function(req,res) {
  if(!req.user) {
    res.render('login');
  } else {
    res.send('Logged in as: ' + req.user.human + "<a href='/logout'>Logout</a>");
  }
};

// GET or POST /change
exports.changelang = function(req,res) {
  if(typeof(req.user) === 'undefined') {
    res.redirect('/');
  }
  if(req.method === 'POST') {
    Language.find({name:req.body.to},function(err,lang) {
      if(!err && lang.length == 1) {
        req.user.cwl = lang[0]._id;
        req.user.save();
        res.send('success');
      } else if (lang.length > 1) {
        // send back a list of languages
        res.render('list',{of:lang});
      } else {
        res.send('failed');
      }
    });
  } else {
    res.render('lang',{title:'Change Language'});
  }
};

// GET /search
exports.search = function(req,res) {
  res.render('search',{title:'Lookup Word'});
};

// POST /search
exports.results = function(req,res) {
  // TODO: implement this
};

// GET /create
exports.createlang = function(req,res) {
  res.render('create',{title:'Create Language',language:req.query['lang']});
};

// POST /create
exports.postcreate = function(req,res) {
  var l = new Language({
    owner: req.user._id,
    name: req.body.name,
    official: (req.body.official && (req.host === 'localhost')),
    sdesc: req.body.sdesc,
    ldesc: req.body.ldesc
  });
  l.save(function(err,lang){
    if(err) console.log("MONGODB error: " + err);
    // set the current working language to the newly-created language
    req.user.cwl = lang._id;
    req.user.save();
    res.redirect('/');
  });
};

// GET /register
exports.register = function(req,res) {
  if(req.user) {
    res.render('error',{error:'You can\'t register a new account while you are logged in!'});
  } else {
    var admin = (req.host === 'localhost');
    res.render('register',{title:'Register User',admin:admin});
  }
};

// POST /register
exports.newuser = function(req,res) {
  if(req.body.admin && req.host !== 'localhost') {
    res.render(403,'error',{title:'Error',error:'unauthorised attempt to add admin user'});
  } else {
    User.find({
      username: req.body.username
    },function(err,user) {
      if(user.length != 0) {
        res.render('error',{title:'Error',error:'duplicate username'});
      } else {
        var usr = new User({
          username: req.body.username,
          password: req.body.password,
          email: req.body.email,
          admin: req.body.admin ? true : false,
          human: req.body.human
        });
        usr.save(function(err) {
          if(err) console.log('MONGODB error: ' + err);
          res.render('newuser',{title:'Welcome!',user:usr});
        });
      }
    });
  }
};

// GET /debug
exports.debug = function(req,res) {
  if(req.host === 'localhost') {
    switch(req.query['a']) {
      case 'user':
        res.send('user: ' + JSON.stringify(req.user));
        break;
      case 'list':
        User.find(function(err,users) {
          res.send('users:' + JSON.stringify(users));
        });
        break;
      case 'langs':
        Language.find(function(err,langs) {
          res.send('languages: ' + JSON.stringify(langs));
        });
        break;
      case 'drop':
        switch(req.query['db']) {
          case 'user':
            User.remove().exec();
            break;
          case 'lang':
            Language.remove().exec();
            break;
          case 'dict':
            Dictionary.remove().exec();
            break;
        }
        res.send('done');
        break;
    }
    
  } else {
    res.send(403);
  }
};
