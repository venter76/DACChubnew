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
  },
  count: {
    type: Number,
    default: 0
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



app.get("/", async function(req, res) {
  if (req.session.userId) {
    try {
      const user = await Hubuser.findById(req.session.userId);
      if (!user) {
        return res.redirect('/login');
      }

      // Increment the count
      user.count += 1;
      console.log(`User count after increment: ${user.count}`);
      await user.save();

      // Check if the modal should be displayed
      const shouldShowModal = user.count <= 3;
      console.log(`shouldShowModal value: ${shouldShowModal}`);

      res.render('home', { shouldShowModal });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.redirect('/login');
    }
  } else {
    res.render('login', { message: req.flash('loginMessage') });
  }
});

app.get("/android", (req, res) => {
  res.render('android'); // Ensure you have an android.ejs file
});

app.get("/iphone", (req, res) => {
  res.render('iphone'); // Ensure you have an iphone.ejs file
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


 // Route to handle the form submission
app.post("/android", async (req, res) => {
  const { buttonValue } = req.body;
  const userId = req.session.userId; // Ensure the user is authenticated and their ID is stored in the session

  try {
    const user = await Hubuser.findById(userId);
    if (!user) {
      return res.redirect('/login');
    }

    // Update the user's count to the value of 343
    user.count = parseInt(buttonValue, 10);
    await user.save();

    // Redirect back to the home page
    res.redirect('/');
  } catch (error) {
    console.error('Error updating user count:', error);
    res.redirect('/login');
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






