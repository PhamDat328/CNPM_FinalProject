const Order = require("../models/Orders");
const User = require("../models/User");
const formidable = require("formidable");
const async = require("hbs/lib/async");
const jwt = require("jsonwebtoken");
const Card = require("../models/Card");
const Transaction = require("../models/History");
const Account = require("../models/Account");
const uploadDir = __dirname + "/../public/images/uploads";
const mailer = require("./sendMail");
const { Cookie } = require("express-session");
const Product = require("../models/Products");
const { count } = require("../models/User");
function generateLocalDate() {
  let d = new Date();
  let currentDate = new Date(Date.now() - d.getTimezoneOffset() * 60 * 1000);
  return currentDate;
}

const generateRanOrderId = () => {
  let username = "o";
  for (let i = 0; i < 9; i++) {
    username += Math.floor(Math.random() * 10);
  }
  return username;
};

function toMoney(moneyamount, style = "VND") {
  return (
    parseFloat(moneyamount).toLocaleString("en-US", {
      maximumFractionDigits: 2,
    }) +
    " " +
    style
  );
}

function backToInputForm(view, user, res, error, dataBag) {
  return res.render(view, {
    title: "SmartWallet",
    layout: "main",
    user: user.toObject(),
    depositButton: true,
    error: error,
    ...dataBag,
  });
}

function makeDeposit(user, userAccount, req, res, error, dataBag) {
  if (parseFloat(req.body.amount) <= 0) {
    error.isError = true;
    error.errorMessage = "Số tiền giao dịch không hợp lệ";
    return backToInputForm("deposit", user, res, error, dataBag);
  }
  Account.updateOne(
    { username: user.username },
    { $inc: { balance: req.body.amount } },
    async (err, result) => {
      if (err || result["modifiedCount"] < 1) {
        error.isError = true;
        error.errorMessage =
          "Có lỗi xảy ra trong quá trình thực hiện. Vui lòng thử lại.<br>";
        return backToInputForm("deposit", user, res, error, dataBag);
      } else {
        Transaction.create({
          userID: user.username,
          transactionType: "Deposit",
          transactionDate: generateLocalDate(),
          transactionAmount: req.body.amount,
          status: "Thành công",
          describe: `So tien giao dich: +${toMoney(
            req.body.amount
          )}\nSo du hien tai: ${toMoney(
            parseInt(userAccount.balance) + parseInt(req.body.amount)
          )}`,
        });
        return res.redirect("/");
      }
    }
  );
}

function makeWithdraw(
  user,
  userAccount,
  req,
  res,
  error,
  dataBag,
  amountWithFee
) {
  if (parseFloat(req.body.amount) <= 0) {
    error.isError = true;
    error.errorMessage = "Số tiền giao dịch không hợp lệ";
    return backToInputForm("withdraw", user, res, error, dataBag);
  }

  if (parseFloat(req.body.amount) < 5000000) {
    Account.updateOne(
      { username: user.username },
      { $inc: { balance: amountWithFee * -1 } },
      async (err, result) => {
        if (err || result["modifiedCount"] < 1) {
          error.isError = true;
          error.errorMessage =
            "Có lỗi xảy ra trong quá trình thực hiện. Vui lòng thử lại.<br>";
          return backToInputForm("withdraw", user, res, error, dataBag);
        } else {
          Transaction.create({
            userID: user.username,
            transactionType: "Withdraw",
            transactionDate: generateLocalDate(),
            transactionAmount: amountWithFee,
            status: "Thành công",
            describe: `So tien giao dich: -${toMoney(
              req.body.amount
            )}\nPhi rut tien: ${toMoney(
              (req.body.amount * 5) / 100
            )}\nSo du hien tai: ${toMoney(
              parseFloat(userAccount.balance) - parseFloat(amountWithFee)
            )}\nGhi chu: ${req.body.note}`,
          });
          return res.redirect("/");
        }
      }
    );
  } else {
    Transaction.create({
      userID: user.username,
      transactionType: "Withdraw",
      transactionDate: generateLocalDate(),
      transactionAmount: amountWithFee,
      status: "Pending",
      describe: `Yêu cầu giao dịch đã được ghi nhận. Do số tiền lớn hơn 5.000.000 đồng nên vui lòng đợi được duyệt`,
    });

    //So tien giao dich: -${toMoney(req.body.amount)}\nPhi rut tien: ${toMoney((req.body.amount * 5) / 100)}\nSo du hien tai: ${toMoney(parseFloat(userAccount.balance) - parseFloat(amountWithFee))}\nGhi chu: ${req.body.note}
    return res.redirect("/");
  }
}

module.exports = {
  getDepositForm: async (req, res, next) => {
    if (!req.session.isLogin) {
      return res.redirect("/login");
    } else {
      const accessToken = req.cookies.accessToken;
      const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
      let user = await User.findOne({ username: verifyToken.data.username });
      return res.render("deposit", {
        title: "SmartWallet",
        layout: "main",
        user: user.toObject(),
        depositButton: true,
      });
    }
  },

  postDepositForm: async (req, res) => {
    if (!req.session.isLogin) {
      return res.redirect("/login");
    } else {
      const accessToken = req.cookies.accessToken;
      const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
      let user = await User.findOne({ username: verifyToken.data.username });
      let error = {
        isError: false,
        errorMessage: "",
      };
      let dataBag = {
        preCardNumber: req.body.cardNumber,
        preCVV: req.body.cvv,
        preExp: req.body.exp,
      };
      if (
        req.body.cardNumber === "" ||
        req.body.exp === "" ||
        req.body.cvv === "" ||
        req.body.amount === ""
      ) {
        error.isError = true;
        error.errorMessage = "Vui lòng điền đủ thông tin";
        return backToInputForm("deposit", user, res, error, dataBag);
      }

      Card.findOne({ cardNumber: req.body.cardNumber }, async (err, data) => {
        if (data === null) {
          error.isError = true;
          error.errorMessage = "Số thẻ này không tồn tại";
          return backToInputForm("deposit", user, res, error, dataBag);
        }
        if (req.body.cvv !== data["CVVcode"]) {
          error.isError = true;
          error.errorMessage = "Mã CVV không trùng khớp<br>";
        }

        if (req.body.exp != data["expireDate"]) {
          error.isError = true;
          error.errorMessage = error.errorMessage +=
            "Ngày hết hạn trùng khớp<br>";
        }

        if (error.isError) {
          return backToInputForm("deposit", user, res, error, dataBag);
        } else {
          let userAccount = await Account.findOne(
            { username: user.username },
            { balance: 1 }
          );
          switch (req.body.cardNumber) {
            case "111111":
              return makeDeposit(user, userAccount, req, res, error, dataBag);

            case "222222":
              if (req.body.amount > 1000000) {
                error.isError = true;
                error.errorMessage =
                  "Thẻ 222222 chỉ được nạp tối đa 1 triệu/lần";
                return backToInputForm("deposit", user, res, error, dataBag);
              } else {
                return makeDeposit(user, userAccount, req, res, error, dataBag);
              }

            case "333333":
              error.isError = true;
              error.errorMessage = "Thẻ 333333 đã hết tiền";
              return backToInputForm("deposit", user, res, error, dataBag);
          }
        }
      });
    }
  },

  getWithdrawForm: async (req, res, next) => {
    if (!req.session.isLogin) {
      return res.redirect("/login");
    } else {
      const accessToken = req.cookies.accessToken;
      const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
      let user = await User.findOne({ username: verifyToken.data.username });
      return res.render("withdraw", {
        title: "SmartWallet",
        layout: "main",
        user: user.toObject(),
        withdrawButton: true,
      });
    }
  },

  postWithdrawForm: async (req, res, next) => {
    if (!req.session.isLogin) {
      return res.redirect("/login");
    } else {
      const accessToken = req.cookies.accessToken;
      const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
      let user = await User.findOne({ username: verifyToken.data.username });
      let error = {
        isError: false,
        errorMessage: "",
      };
      let dataBag = {
        preCardNumber: req.body.cardNumber,
        preCVV: req.body.cvv,
        preExp: req.body.exp,
        preNote: req.body.note,
      };
      if (
        req.body.cardNumber === "" ||
        req.body.exp === "" ||
        req.body.cvv === "" ||
        req.body.amount === "" ||
        req.body.note === ""
      ) {
        error.isError = true;
        error.errorMessage = "Vui lòng điền đủ thông tin";
        return backToInputForm("withdraw", user, res, error, dataBag);
      }

      if (req.body.cardNumber !== "111111") {
        error.isError = true;
        error.errorMessage = "Thẻ này không được hỗ trợ rút tiền";
        return backToInputForm("withdraw", user, res, error, dataBag);
      }

      Card.findOne({ cardNumber: req.body.cardNumber }, async (err, data) => {
        if (data === null) {
          error.isError = true;
          error.errorMessage = "Số thẻ này không tồn tại";
          return backToInputForm("withdraw", user, res, error, dataBag);
        }
        if (req.body.cvv !== data["CVVcode"]) {
          error.isError = true;
          error.errorMessage = "Mã CVV không trùng khớp<br>";
        }

        if (req.body.exp != data["expireDate"]) {
          error.isError = true;
          error.errorMessage = error.errorMessage +=
            "Ngày hết hạn trùng khớp<br>";
        }

        if (error.isError) {
          return backToInputForm("withdraw", user, res, error, dataBag);
        } else {
          let userAccount = await Account.findOne(
            { username: user.username },
            { balance: 1, remainWithDrawPerDay: 1 }
          );

          if (userAccount.remainWithDrawPerDay <= 0) {
            error.isError = true;
            error.errorMessage = "Bạn đã hết số lần rút tiền hôm nay";
            return backToInputForm("withdraw", user, res, error, dataBag);
          } else {
            let amountWithFee =
              parseFloat(req.body.amount) + (req.body.amount * 5) / 100;

            if (parseFloat(req.body.amount) % 50000 !== 0) {
              error.isError = true;
              error.errorMessage =
                "Số tiền rút mỗi lần phải là bội số của 50,000 đồng";
              return backToInputForm("withdraw", user, res, error, dataBag);
            }
            if (userAccount.balance < amountWithFee) {
              error.isError = true;
              error.errorMessage = "Số dư không đủ để trả 5% phí rút tiền";
              return backToInputForm("withdraw", user, res, error, dataBag);
            }

            return makeWithdraw(
              user,
              userAccount,
              req,
              res,
              error,
              dataBag,
              amountWithFee
            );
          }
        }
      });
    }
  },

  getTransferForm: async (req, res, next) => {
    if (!req.session.isLogin) {
      return res.redirect("/login");
    } else {
      const accessToken = req.cookies.accessToken;
      const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
      let user = await User.findOne({ username: verifyToken.data.username });
      return res.render("transfer", {
        title: "SmartWallet",
        layout: "main",
        user: user.toObject(),
        transferButton: true,
      });
    }
  },

  getBuyPhoneCardForm: async (req, res, next) => {
    if (!req.session.isLogin) {
      return res.redirect("/login");
    } else {
      const accessToken = req.cookies.accessToken;
      const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
      let user = await User.findOne({ username: verifyToken.data.username });
      return res.render("buyphonecard", {
        title: "SmartWallet",
        layout: "main",
        user: user.toObject(),
        buyButton: true,
      });
    }
  },
  getTransactionHistory: async (req, res, next) => {
    if (!req.session.isLogin) {
      return res.redirect("/login");
    } else {
      const accessToken = req.cookies.accessToken;
      const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
      let user = await User.findOne({ username: verifyToken.data.username });
      return res.render("transaction", {
        title: "SmartWallet",
        layout: "main",
        user: user.toObject(),
        transactionButton: true,
      });
    }
  },

  getProfile: async (req, res, next) => {
    if (req.session.isLogin) {
      const user = await User.findOne({ username: req.session.username })
        .lean()
        .select("dateOfBirth phoneNumber fullName address email avatar");
      const orders = await Order.find({
        customer_id: { $in: req.session.username },
      }).lean();
      user.dateOfBirth = user.dateOfBirth.toLocaleString("en-GB").split(",")[0];

      const account = await Account.findOne({
        username: req.session.username,
      })
        .lean()
        .select("balance status history username");

      if (account.status === "pending") {
        account.status = "Đang chờ duyệt";
      } else if (account.status === "activated") {
        account.status = "Đã xác thực";
      } else if (account.status === "addition") {
        account.status = "Chờ bổ sung thêm thông tin";
      }
      return res.render("profile", {
        layout: "userLayout",
        user,
        account,
        orders,
      });
    } else {
      return res.redirect("/login");
    }
  },

  getForgotPasswordForm: (req, res) => {
    req.session.destroy();
    res.render("forgotPassword", {
      title: "SmartWallet",
      layout: "blankLayout",
    });
  },

  getOTPForm: (req, res) => {
    if (
      req.session.recoverEmail &&
      req.session.recoverOTP &&
      req.session.otpExpire
    ) {
      let otpExpire = new Date(req.session.otpExpire);
      let current = generateLocalDate();
      let timeBetweenExpAndCurr = new Date(otpExpire - current);
      let remainTime =
        timeBetweenExpAndCurr.getMinutes() * 60000 +
        timeBetweenExpAndCurr.getSeconds() * 1000;
      console.log(otpExpire);
      console.log(current);
      console.log(timeBetweenExpAndCurr);
      return res.render("enterOTP", {
        title: "SmartWallet",
        layout: "blankLayout",
        recoverEmail: req.session.recoverEmail,
        expireTime: remainTime,
      });
    } else {
      return res.redirect("/users/forgotpassword");
    }
  },
  postForgotPasswordForm: (req, res) => {
    User.findOne({ email: req.body.recoverEmail }, async (err, result) => {
      if (err !== null) {
        return res.render("forgotPassword", {
          title: "SmartWallet",
          layout: "blankLayout",
          error: "Xảy ra lỗi trong việc tìm kiếm. Vui lòng thử lại",
        });
      } else {
        if (result === null) {
          return res.render("forgotPassword", {
            title: "SmartWallet",
            layout: "blankLayout",
            error: "Email chưa được đăng ký",
          });
        } else {
          let otp = "";
          let otpExpire = generateLocalDate();
          for (let i = 0; i <= 5; i++) {
            otp += Math.floor(Math.random() * 9);
          }

          req.session.recoverOTP = otp;
          req.session.otpExpire = otpExpire.setMinutes(
            otpExpire.getMinutes() + 1.5
          );
          req.session.recoverEmail = req.body.recoverEmail;
          console.log(req.session);
          // await mailer.sendMail(req.body.recoverEmail, 'Smart Wallet System', otp)
          return res.redirect("/users/recover");
        }
      }
    }).select("username");
  },
  postOTPForm: (req, res) => {
    if (
      req.session.recoverEmail &&
      req.session.recoverOTP &&
      req.session.otpExpire
    ) {
      let otpExpire = new Date(req.session.otpExpire);
      let current = generateLocalDate();
      let timeBetweenExpAndCurr = new Date(otpExpire - current);
      let remainTime =
        timeBetweenExpAndCurr.getMinutes() * 60000 +
        timeBetweenExpAndCurr.getSeconds() * 1000;
      // 1 minute = 60000ms , 1second= 1000ms

      if (current < otpExpire && req.session.recoverOTP === req.body.fullOTP) {
        //TODO: goto changepassword form
      } else if (
        current < otpExpire &&
        req.session.recoverOTP !== req.body.fullOTP
      ) {
        return res.render("enterOTP", {
          title: "SmartWallet",
          layout: "blankLayout",
          recoverEmail: req.session.recoverEmail,
          expireTime: remainTime,
          response: "Mã OTP không hợp lệ",
        });
      } else {
        return res.render("enterOTP", {
          title: "SmartWallet",
          layout: "blankLayout",
          recoverEmail: req.session.recoverEmail,
          expireTime: 0,
          response: "Mã OTP đã hết hạn",
        });
      }

      return res.redirect("/login");
    } else {
      return res.redirect("/users/forgotpassword");
    }
  },

  getCart: async (req, res) => {
    const user = await User.findOne({ username: req.session.username });

    const products = await Product.find({
      product_id: { $in: user.cart },
    }).lean();

    const counts = {};
    user.cart.forEach(function (x) {
      counts[x] = (counts[x] || 0) + 1;
    });
    let totalBill = 0;
    for (let i = 0; i < products.length; i++) {
      products[i].quantity = counts[products[i].product_id];
      totalBill +=
        Number(products[i].product_price) * Number(products[i].quantity);
      products[i].totalPrice =
        Number(counts[products[i].product_id]) *
        Number(products[i].product_price);
      products[i].totalPrice = toMoney(products[i].totalPrice);
      products[i].product_price = toMoney(products[i].product_price);
    }
    totalBill = toMoney(totalBill);

    res.render("cart", {
      layout: "userLayout",
      user,
      counts,
      totalBill,
      quantity: user.cart.length,
      products,
    });
  },
  getCheckOut: async (req, res) => {
    const user = await User.findOne({ username: req.session.username });

    const products = await Product.find({
      product_id: { $in: user.cart },
    }).lean();

    const counts = {};
    user.cart.forEach(function (x) {
      counts[x] = (counts[x] || 0) + 1;
    });
    let totalBill = 0;
    for (let i = 0; i < products.length; i++) {
      totalBill += products[i].product_price;
      products[i].quantity = counts[products[i].product_id];
      products[i].totalPrice =
        Number(counts[products[i].product_id]) *
        Number(products[i].product_price);
      products[i].totalPrice = toMoney(products[i].totalPrice);
      products[i].product_price = toMoney(products[i].product_price);
    }
    totalBill = toMoney(totalBill);

    res.render("pay-form", {
      layout: "userLayout",
      user,
      counts,
      totalBill,
      quantity: user.cart.length,
      products,
    });
  },
  getProductDetail: async (req, res) => {
    try {
      const product = await Product.findOne({
        product_id: req.params.product_id,
      }).lean();

      const keys = Object.keys(product.product_detail);

      keys.forEach((el) => {
        product.product_detail.keys = el.toUpperCase();
      });
      product.product_price = toMoney(product.product_price);

      res.render("product-detail", { layout: "userLayout", product });
    } catch (error) {
      console.log(error);
    }
  },

  addToCart: async (req, res) => {
    const user = await User.findOne({ username: req.session.username });
    await user.updateOne({ $push: { cart: req.params.product_id } });

    res.redirect("/cart");
  },

  getSuccessfulOrder: (req, res) => {
    res.render("successfulOrder", { layout: "blankLayout" });
  },

  postCheckOut: async (req, res) => {
    const user = await User.findOne({ username: req.session.username });

    const products = await Product.find({
      product_id: { $in: user.cart },
    }).lean();

    const counts = {};
    user.cart.forEach(function (x) {
      counts[x] = (counts[x] || 0) + 1;
    });
    let totalBill = 0;
    for (let i = 0; i < products.length; i++) {
      totalBill += products[i].product_price;
      products[i].quantity = counts[products[i].product_id];
      products[i].totalPrice =
        Number(counts[products[i].product_id]) *
        Number(products[i].product_price);
      products[i].totalPrice = toMoney(products[i].totalPrice);
      products[i].product_price = toMoney(products[i].product_price);
    }
    totalBill = toMoney(totalBill);
    const orderDate = generateLocalDate().toLocaleString("en-GB").split(",")[0];
    const order_id = generateRanOrderId();

    const customer_id = req.session.username;
    const items = products;
    const totalsPrice = totalBill;
    const paymentMethods = req.body.paymentMethod;
    const shippingAddress = {
      customer_name: req.body.name,
      customer_email: req.body.email,
      customer_phone: req.body.phone,
      address: `${req.body.cuthe}, ${req.body.xa},${req.body.huyen}, ${req.body.tinh}`,
    };

    console.log(shippingAddress);

    const order = await Order.create({
      orderDate,
      order_id,
      customer_id,
      items,
      totalsPrice,
      paymentMethods,
      shippingAddress,
    });
    await user.updateOne({ $set: { cart: [] } });
    // await user.update({}, { $set: { cart: [] } }, { multi: true });

    res.redirect("/successfulOrder");
  },
};
