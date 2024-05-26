const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const moment = require('moment');
require('dotenv').config();

const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const flash = require('connect-flash');




const fixedHashedPassword = process.env.FIXED_HASHED_PASSWORD;



  

const app = express();
const PORT = process.env.PORT || 3000

app.set('view engine', 'ejs');

app.use(express.static("public"));

app.use(bodyParser.urlencoded({extended: true}));



const db_username = process.env.DB_USERNAME;
const db_password = process.env.DB_PASSWORD;
const db_cluster_url = process.env.DB_CLUSTER_URL;
const db_name = process.env.DB_NAME;


const connectDB = async () => {
  try {
    const conn = await mongoose.connect(`mongodb+srv://${db_username}:${db_password}@${db_cluster_url}/${db_name}?retryWrites=true&w=majority`, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB Atlas:', conn.connection.host);
  } catch (error) {
    console.error('Error connecting to MongoDB Atlas:', error);
    process.exit(1);
  }
};


//Session cookie setup:


app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: `mongodb+srv://${db_username}:${db_password}@${db_cluster_url}/${db_name}?retryWrites=true&w=majority`,
    }),
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // must be 'none' to enable cross-site delivery
      httpOnly: true, // prevents JavaScript from making changes
      maxAge: 1000 * 60 * 60 * 24 * 365 // 1 year

    }
  }));

// After you've set up your sessions
app.use(flash());

// Make sure to pass the flash messages into your context for the view
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  next();
});



  
const hubuserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name']
  },
  surname: {
    type: String,
    required: [true, 'Please provide your surname']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password']
  }
});

const Hubuser = mongoose.model('Hubuser', hubuserSchema);


const urlSchema = new mongoose.Schema({
  index: {
    type: Number,
    required: true,
    unique: true
  },
  url: {
    type: String,
    required: true
  }
});

const URL = mongoose.model('URL', urlSchema);

  


  // Example seeding script
// const urls = [
//   { index: 1, url: "https://en.m.wikipedia.org/wiki/Adrian_Grenier" },
//   { index: 2, url: "https://powerplastics.co.za/" },
//   { index: 3, url: "https://dacctracker-742a16133bc9.herokuapp.com/" },
//   // Add more URLs as needed
// ];

// urls.forEach(async (urlData) => {
//   const url = new URL(urlData);
//   await url.save();
// });





  




  


  

  

  app.get('/checkOnline', (req, res) => {
    console.log('Entered checkOnline route');
    res.status(200).send('Online');
});


app.get('/login', (req, res) => {
  res.render('login', { error: req.flash('error') });
});





app.post('/login', async (req, res) => {
  const { name, surname, password } = req.body;
  const fixedPasswordHash = process.env.FIXED_PASSWORD_HASH;

  console.log('Login attempt:', { name, surname });

  try {
    let user = await Hubuser.findOne({ name, surname });
    console.log('User found:', user);

    if (!user) {
      console.log('No existing user found, creating new user');
      // Create a new user with the fixed hashed password
      user = new Hubuser({ name, surname, password: fixedPasswordHash });
      await user.save();
      console.log('New user created:', user);
    }

    // Compare the provided password with the fixed hashed password
    const isMatch = await bcrypt.compare(password, fixedPasswordHash);
    console.log('Password match:', isMatch);

    if (isMatch) {
      req.session.userId = user._id;
      req.session.userName = user.name;
      console.log('Session before save:', req.session);

      req.session.save(err => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).send('An error occurred saving the session.');
        }
        console.log('Session saved successfully.');
        return res.redirect('/');
      });
    } else {
      console.log('Password does not match for user:', name);
      req.flash('error', 'Incorrect password.');
      res.redirect('/login');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('An error occurred during the login process.');
  }
});



app.get("/", function(req, res) {
  // Check if user is logged in by looking for session userId
  if (req.session.userId) {
    // User is logged in, render the home page with "Hello World"
    res.render('home');
  } else {
    // User is not logged in, render the login page
    res.render('login', { message: req.flash('loginMessage') });
  }
});

 

  
app.post('/redirect', async (req, res) => {
  const { buttonIndex } = req.body; // Assume buttonIndex is passed as the POST body

  try {
    const urlEntry = await URL.findOne({ index: buttonIndex });
    if (urlEntry) {
      res.redirect(urlEntry.url);
    } else {
      res.status(404).send('URL not found');
    }
  } catch (error) {
    console.error('Error redirecting:', error);
    res.status(500).send('Server error');
  }
});


  
    
  

    
app.get('/manifest.json', (req, res) => {
  res.sendFile(`${__dirname}/manifest.json`);
});

app.get('/service-worker.js', (req, res) => {
  res.sendFile(`${__dirname}/service-worker.js`);
});
  
 
  



connectDB().then(() => {
  app.listen(PORT, () => {
      console.log("listening for requests");
  })
})






