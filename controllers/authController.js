const User = require("../models/User");
const Account = require("../models/Account");
const formidable = require("formidable");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../app");
const mailer = require("./sendMail");
const async = require("hbs/lib/async");
const uploadDir = __dirname + "/../public/images/uploads";
fs.existsSync(uploadDir) || fs.mkdirSync(uploadDir);
const Product = require("../models/Products")
const generateRandomUsername = () => {
  let username = "";
  for (let i = 0; i < 10; i++) {
    username += Math.floor(Math.random() * 10);
  }
  return username;
};

const generateRandomPassword = () => {
  let allAscii =
    "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
  let password = "";
  for (let i = 0; i < 6; i++) {
    password += allAscii[Math.floor(Math.random() * allAscii.length)];
  }
  return password;
};

function toMoney(moneyamount, style = 'VND') {

    return parseFloat(moneyamount).toLocaleString('en-US', {
        maximumFractionDigits: 2
    }) + ' ' + style;
}

function compareLastLoginWithCurrentTime(currentDate, LastLogin) {
  if (currentDate.getFullYear() === LastLogin.getFullYear()) {
    if (currentDate.getMonth() === LastLogin.getMonth()) {
      if (currentDate.getDate() === LastLogin.getDate()) {
        return false;
      } else if (currentDate.getDate() > LastLogin.getDate()) {
        return true;
      } else {
        return false;
      }
    } else if (currentDate.getMonth() > LastLogin.getMonth()) {
      return true;
    } else {
      return false;
    }
  } else if (currentDate.getFullYear() > LastLogin.getFullYear()) {
    return true;
  } else {
    return false;
  }
}

async function makeLogin(account,validPassword,currentDate,message,req ,res)
{ 
    if(!validPassword && account.admin === false)
    {
        await account.updateOne({$inc: {abnormalLogin: +1}})

        if(account.abnormalLogin >= 2){

            if(account.lockedTimes < 1){

                message.status = true;
                message.message =  `Sai mật khẩu <br> Bạn đã nhập sai mật khẩu ${account.abnormalLogin +1}/3 lần <br> Tài khoản của bạn sẽ bị khóa trong 1 phút`;
                await account.updateOne({ lockTo: currentDate.setMinutes(currentDate.getMinutes() + 1), isLocked: true, $inc: { lockedTimes: 1 } })
            }
            else{
                message.status = true;
                message.message = `Tài khoản đã bị khóa do nhập sai mật khẩu nhiều lần, vui lòng liên hệ quản trị viên để được hỗ trợ`
                await account.updateOne({ lockTo: currentDate.setFullYear(currentDate.getFullYear() + 100), isLocked: true, $inc: { lockedTimes: 1 } })
            }
        }
        else{
            message.status = true;
            message.message = `Sai mật khẩu <br> Bạn đã nhập sai mật khẩu ${account.abnormalLogin +1}/3 lần`
        }
        return res.status(400).render("login", { layout: "blankLayout", message: message });
    }
    if(validPassword && account)
    {
        let data = {
        username: account.username,
        admin: account.admin,
        }
        let accessToken = authController.generateAccessToken(data);
        let refreshToken = authController.generateRefreshToken(data);
        await account.updateOne({ refreshToken: refreshToken });
        res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: false,
        path: "/",
        sameSite: "strict",
        });

        if(account.lastLogin !== null && compareLastLoginWithCurrentTime(currentDate,account.lastLogin))
        {
            await account.updateOne({remainWithDrawPerDay: 2})
        }

        req.session.username = account.username;

        if (!account.lastLogin) {
            return res.redirect("/changePassword");
        }

        req.session.isLogin = true;
        await account.updateOne({ lastLogin: currentDate, abnormalLogin: 0 });
        return res.redirect("/"); 
    }
    // message.status = true;
    // message.message = `Đăng nhập thất bại. Vui lòng thử lại sau`
    // return res.status(400).render("login", {layout: "blankLayout",message: message});  
}

const authController = {
  getLoginPage: (req, res, next) => {
    res.render("login", { title: "Express", layout: "blankLayout" });
  },
  getRegisterPage: (req, res, next) => {
    res.render("register", { title: "Express", layout: "blankLayout" });
  },

  getSuccessRegister: (req, res) => {
    res.render("successRegister", { layout: "blankLayout" });
  },

  postRegisterPage: async (req, res) => {
        const username = generateRandomUsername();
        const password = generateRandomPassword();
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);

        try {
            const form = new formidable.IncomingForm();
            form.parse(req, async(err, fields, files) => {
                if (err) {
                    req.session.flash = {
                        type: "danger",
                        info: "Oops!",
                        message: "There was an error processing your submission. \n Please try again.",
                    };
                    return res.render("error");
                }
                const {
                    fullName,
                    email,
                    address,
                    phoneNumber,
                    dateOfBirth
                } = fields;

                const avatarImage = files.avatar;

                const dir = uploadDir + "/" + username;
                const pathAvatar =
                    "/images/uploads/" +
                    username +
                    "/avatar." +
                    avatarImage.originalFilename.split(".")[1];
                

                fs.mkdirSync(dir);
                fs.renameSync(
                    avatarImage.filepath,
                    dir + "/avatar." + avatarImage.originalFilename.split(".")[1]
                );

                let errorMess = {
                    isError: false,
                    errorE: false,
                    messageE: "",
                    errorPN: false,
                    messagePN: "",
                };

                User.findOne({
                    email: email
                }, (err, data) => {
                    if (data != null) {
                        errorMess.isError = true;
                        errorMess.errorE = true;
                        errorMess.messageE = "This email is already exist";
                        User.findOne({
                            phoneNumber: phoneNumber
                        }, async(err, data) => {
                            if (data != null) {
                                errorMess.isError = true;
                                errorMess.errorPN = true;
                                errorMess.messagePN = "This phone number is already exist";
                            }
                            return res.render("register", {
                                layout: "blankLayout",
                                error: errorMess,
                                fullName,
                                address,
                                dateOfBirth,
                            });
                        });
                    } else {
                        User.findOne({
                            phoneNumber: phoneNumber
                        }, async(err, data) => {
                            if (data != null) {
                                errorMess.isError = true;
                                errorMess.errorPN = true;
                                errorMess.messagePN = "This phone number is already exist";
                                return res.render("register", {
                                    layout: "blankLayout",
                                    error: errorMess,
                                    fullName,
                                    address,
                                    dateOfBirth,
                                });
                            } else {
                                let d = new Date();
                                let currentDate = new Date(Date.now() - d.getTimezoneOffset() * 60 * 1000)
                                const newUser = await User.create({
                                    username,
                                    fullName,
                                    email,
                                    address,
                                    phoneNumber,
                                    dateOfBirth,
                                    avatarImage:  pathAvatar,
                                    createAt: currentDate,
                                });
                                const newAccount = await Account.create({
                                    username,
                                    password,
                                    hashPassword: hashed,
                                });
                                let mailContent = `Username: ${username} \nPassword: ${password}`;
                                mailer.sendMail(email, 'Smart Wallet Accout System', mailContent)
                                res.redirect("/successRegister");
                            }
                        });
                    }
                });
            });
        } catch (error) {
            res.status(500).render("register", {
                error: error
            });
        }
    },

    generateAccessToken: (data) => {
        return jwt.sign({
            data
        }, process.env.JWT_ACCESS_KEY, {
            expiresIn: "1h",
        });
    },

    generateRefreshToken: (data) => {
        return jwt.sign({
            data
        }, process.env.JWT_REFRESH_KEY, {
            expiresIn: "10d",
        });
    },

    refreshToken: async(req, res, next) => {
        if (!req.session.isLogin) {
            return next();
        }
        try {
            const accessToken = req.cookies.accessToken;
            const verifyAccessToken = jwt.verify(
                accessToken,
                process.env.JWT_ACCESS_KEY
            );
            next();
        } catch (error) {
            const data = {
                username: res.account.username,
                admin: res.account.admin,
            };
            const newAccessToken = authController.generateAccessToken(data);
            res.cookie("accessToken", newAccessToken, {
                httpOnly: true,
                secure: false,
                path: "/",
                sameSite: "strict",
            });

            return res.redirect("/");
        }
    },

    getChangePasswordPage: (req, res) => {
        return res.render("changePassword", {
            layout: "blankLayout"
        });
    },

    postChangePasswordPage: async(req, res, next) => {
        try {
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(req.body.newPassword, salt);
            const account = await Account.findOne({
                username: req.session.username,
            });
            if (req.body.newPassword === req.body.confirmPassword) {
                await account.updateOne({
                    lastLogin: Date.now(),
                    hashPassword: hashed,
                });
                req.session.isLogin = true;
                req.session.username = account.username;
                return res.redirect("/");
            }
            return res.render("changePassword", {
                layout: "blankLayout",
                message: "Confirm password is incorrect",
            });
        } catch (error) {
            console.log(error)
            return res.json(error);
        }
    },

    postLoginPage: async(req, res) => {
        try {

            let account = await Account.findOne({username: req.body.username}).select("+admin");
            let message = {
                status: false,
                message: ""
            }

            let d = new Date();
            let currentDate = new Date(Date.now() - d.getTimezoneOffset() * 60 * 1000)

            if (!account) {
                message.status = true;
                message.message = "Tài khoản không tồn tại"
                return res.status(400).render("login", {
                    layout: "blankLayout",
                    message: message,
                });
            }

            const validPassword = await bcrypt.compare(req.body.password, account.hashPassword);
            
            if (account.isLocked === true) {

                if (account.lockedTimes <= 1 && (account.lockTo.getFullYear() - currentDate.getFullYear()) < 10) 
                {

                    if (account.lockTo <= currentDate) {
                        await account.updateOne({ lockTo: null, isLocked: false, abnormalLogin: 0 })
                        account = await Account.findOne({username: req.body.username}).select("+admin");
                        return makeLogin(account,validPassword,currentDate,message,req,res)
                    }

                    return res.render("login", {
                        layout: "blankLayout",
                        message: { status: true, message: "Tài khoản hiện đang bị tạm khóa, vui lòng thử lại trong vòng 1 phút" }
                    });
                } 
                else {
                    return res.render("login", {
                        layout: "blankLayout",
                        message: { status: true, message: "Tài khoản đã bị khóa do nhập sai mật khẩu nhiểu lần, vui lòng liên hệ quản trị viên để được hỗ trợ" }
                    });
                }

            }
            else{

                return makeLogin(account,validPassword,currentDate,message,req,res)
            } 
        } catch (error) {
            console.log(error.message );
            res.render("login", {
                layout: "blankLayout",
                message: {
                    status: true,
                    message: error
                }
            });
        }
    },

    getHomePage: async(req, res) => {
        if (!req.session.isLogin) {
            return res.redirect("/login");
        } else {
            const accessToken = req.cookies.accessToken;
            const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
            const user = await User.findOne({
                username: verifyToken.data.username,
            }).select("+admin");


            
            
            if (user.admin) {
                
                return res.redirect("/admin")
            }

            const productList = await Product.find({}).lean()
            productList.forEach((product) => {
                product.product_price = toMoney(product.product_price)
            })
            return res.render("homepage", {
                title: "Green.vn",
                layout: "userLayout",
                user: user.toObject(),
                productList: productList
            });
        }
    },

    logout: (req, res) => {
        req.session.isLogin = false;
        res.clearCookie("accessToken");
        res.redirect("/login");
    },

    restrictTo: (...roles) => {
        return (req, res, next) => {
            // roles ['admin', 'lead-guide']. roles='user'
            if (!roles.includes(req.user.role)) {
                return next(
                    new AppError("You do not have permission to perform this action", 403)
                );
            }

            next();
        };
    },

    checkToken: async (req, res, next) => {
        if (!req.session.isLogin) {
        return next();
        }
        try {
        const account = await Account.findOne({
            username: req.session.username,
        });

        if (account) {
            const refreshToken = account.refreshToken;

            const verifyRefreshToken = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_KEY
            );
            res.account = account;
            next();
        }
        } catch (error) {
        return res.json(error);
        }
    },

};

module.exports = authController;
