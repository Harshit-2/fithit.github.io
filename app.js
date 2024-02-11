require("dotenv").config();

mongoose.set("strictQuery", false);
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

// EXPRESS SPECIFIC STUFF
app.use("/static", express.static("static")); // For serving static files
app.engine("html", require("ejs").renderFile);

// HTML SPECIFIC STUFF
app.set("view engine", "html"); // Set the template engine as html
app.set("views", path.join(__dirname, "views")); // Set the views directory

//Creating & initialize session & cookies using passport.js
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

//connecting to mongoDB
async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/gymDB");
}
main().catch((err) => console.log(err));

// Schema of contact info and User account creation
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  address: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
});

const userSchema = new mongoose.Schema({
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String },
  userid: { type: String, required: true },
});

userSchema.plugin(passportLocalMongoose);

const Contact = mongoose.model("Contact", contactSchema);
const User = mongoose.model("Users", userSchema);

//Using passport.js to serialize and deserialize
passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
  done(null, user._id);
});
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

// ENDPOINTS
app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    let isLoggedIn = 1;
    res.status(200).render("home.ejs", { info: isLoggedIn });
  } else {
    let isLoggedIn = 0;
    res.status(200).render("home.ejs", { info: isLoggedIn });
  }
});

app.get("/contact", (req, res) => {
  if (req.isAuthenticated()) {
    const params = {};
    res.status(200).render("contact.html", params);
  } else {
    res.status(200).redirect("/login");
  }
});

app.get("/services", (req, res) => {
  if (req.isAuthenticated()) {
    const params = {};
    res.status(200).render("services.html", params);
  } else {
    res.status(200).redirect("/login");
  }
});

app.get("/source_payment", (req, res) => {
  if (req.isAuthenticated()) {
    const params = {};
    res.status(200).render("source_payment.html", params);
  } else {
    res.status(200).redirect("/login");
  }
});

app.get("/about", (req, res) => {
  if (req.isAuthenticated()) {
    const params = {};
    res.status(200).render("about.html", params);
  } else {
    res.status(200).redirect("/login");
  }
});

app.post("/contact", (req, res) => {
  let myData = new Contact(req.body);
  myData
    .save()
    .then(() => {
      Contact.findOne()
        .sort({ _id: -1 })
        .exec((err, contact) => {
          if (err) {
            console.log(err);
            res.status(400).send("Unable to get last inserted ID");
          } else {
            res.render("submit.ejs", { contactList: [contact] }); // Pass contact as an array
          }
        });
    })
    .catch(() => {
      res.status(400).send("Unable to save item to the Database");
    });
});

//Serving Login page
app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/profile");
  } else {
    res.status(200).render("login.html");
  }
});

// app.get("/source_payment", (req, res) => {
//   if (req.isAuthenticated()) {
//     res.redirect("/profile");
//   } else {
//     res.status(200).render("login.html");
//   }
// });

// Handle login form submission
app.post("/login", (req, res) => {
  const userLogInfo = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(userLogInfo, function (err) {
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/profile");
      });
    }
  });
});

// Serving signup page
app.get("/signup", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/profile");
  } else {
    const params = {};
    res.status(200).render("signup.html", params);
  }
});

// Handle Signup form submission
app.post("/signup", (req, res) => {
  if ((req.body.password = req.body.confirmPassword)) {
    const userID =
      req.body.fName.replace(/ /g, "").toLowerCase() +
      req.body.lName.replace(/ /g, "").toLowerCase() +
      Math.floor(Math.random() * 100000 + 1000).toString();

    User.register(
      {
        username: req.body.username,
        fname: req.body.fName,
        lname: req.body.lName,
        userid: userID,
      },
      req.body.password,
      function (err, user) {
        if (err) {
          console.log(err);
          res.redirect("/signup");
        } else {
          passport.authenticate("local")(req, res, () => {
            res.redirect("/login");
          });
        }
      }
    );
  } else {
    res.redirect("/signup");
  }
});

app.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// Profile section
app.get("/profile", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("profile.ejs", { userInfo: req.user });
  } else {
    res.redirect("/login");
  }
});

// Port configuration, works in both dev mode and deployment mode
let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}

app.listen(port, () => {
  console.log(`Server running at port http://localhost:${port}`);
});
