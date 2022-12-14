const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
// const logger = require("morgan");
const dotenv = require("dotenv");
const hbs = require("express-handlebars");
const session = require("express-session");
// const jwt = require("jsonwebtoken");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const adminRouter = require("./routes/admin");
dotenv.config("./.env");
const app = express();

//Connect Database
const DB = require("./connectDB");
const authController = require("./controllers/authController");
const { type } = require("os");
DB.connect();

// view engine setup
app.engine("hbs", hbs.engine({ extname: ".hbs", defaultLayout: "main" }));
app.set("view engine", "hbs");
app.use(cors());
const hbsCreate = hbs.create({});
hbsCreate.handlebars.registerHelper("uppercase", function (context) {
  return context.charAt(0).toUpperCase() + context.slice(1);
});

// app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.static(__dirname + "/public"));
app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: "somesecret",
  })
);
app.use((req, res, next) => {
  // res.cookie()
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.use("/", indexRouter);

app.use("/users", usersRouter);
app.use("/admin", adminRouter);

// catch 404 and forward to error handler
// app.use(function (req, res, next) {
//   next(createError(404));
// });

// // error handler
// app.use(function (err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get("env") === "development" ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render("error");
// });

app.use((req, res, next) => {
  next(createError(404));
});
app.use((err, req, res, next) => {
  return res.render("404", { layout: null });
});

module.exports = app;
