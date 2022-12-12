const User = require("../models/User");
const Account = require("../models/Account");
const jwt = require("jsonwebtoken");
const Transaction = require("../models/History");
const { ObjectId } = require("mongodb");
const adminController = {
  getPending: async (req, res) => {
    const accessToken = req.cookies.accessToken;
    const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
    const user = await User.findOne({
      username: verifyToken.data.username,
    }).lean();
    let pendingAccount = await Account.find({ status: "pending" })
      .lean()
      .select("username");
    let pendingUser = [];

    pendingAccount.forEach((userData) => {
      pendingUser.push(userData.username);
    });
    if (req.query.search == "true") {
      User.find({
        $and: [
          { username: { $in: pendingUser } },
          generateSearchUserFilter(req),
        ],
      })
        .lean()
        .exec((err, result) => {
          if (err !== null) {
            res.redirect("/admin/pending");
          } else {
            let noData = {
              status: true,
              msg: "Không có kết quả",
            };

            if (result.length >= 1) {
              noData.status = false;
            }
            return res.render("pending", {
              layout: "admin",
              user,
              noData: noData,
              pendingUsers: result,
            });
          }
        });
    } else {
      User.find({ username: { $in: pendingUser } })
        .lean()
        .exec((err, result) => {
          let noData = {
            status: true,
            msg: "Không có kết quả",
          };

          if (result.length >= 1) {
            noData.status = false;
          }
          return res.render("pending", {
            layout: "admin",
            user,
            noData: noData,
            pendingUsers: result,
          });
        });
    }
  },
  getActive: async (req, res) => {
    const activeAccounts = await Account.find({ status: "active" });
    let activeUsers = [];
    const accessToken = req.cookies.accessToken;
    const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
    const user = await User.findOne({ username: verifyToken.data.username });
    for (let item of activeAccounts) {
      activeUsers.push(await User.findOne({ username: item.username }).lean());
    }
    return res.render("activated", {
      layout: "admin",
      user,
      activeUsers,
    });
  },
  getDisabled: async (req, res) => {
    const disableAccounts = await Account.find({ status: "disable" });
    let disabledUsers = [];
    const accessToken = req.cookies.accessToken;
    const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
    const user = await User.findOne({ username: verifyToken.data.username });
    for (let item of disableAccounts) {
      disabledUsers.push(
        await User.findOne({ username: item.username }).lean()
      );
    }
    return res.render("disabled", {
      layout: "admin",
      user,
      disabledUsers,
    });
  },

  activated: async (req, res) => {
    try {
      const account = await Account.findOne({ username: req.params.username });
      if (account) {
        await account.updateOne({ status: "activated" });
      }
      return res.redirect("/admin/pending");
    } catch (error) {
      console.log(error);
      return res.render("404", { layout: "blankLayout" });
    }
  },
  disabled: async (req, res) => {
    try {
      const account = await Account.findOne({ username: req.params.username });
      if (account) {
        await account.updateOne({ status: "disabled" });
      }
      return res.redirect("/admin/pending");
    } catch (error) {
      console.log(error);
      return res.render("404", { layout: "blankLayout" });
    }
  },
  addInfo: async (req, res) => {
    try {
      const account = await Account.findOne({ username: req.params.username });
      if (account) {
        await account.updateOne({ status: "waiting update" });
      }
      return res.redirect("/admin/pending");
    } catch (error) {
      console.log(error);
      return res.render("404", { layout: "blankLayout" });
    }
  },

  getUserDetail: async (req, res) => {
    const user = await User.findOne({ username: req.params.username }).lean();
    const account = await Account.findOne({
      username: req.params.username,
    })
      .lean()
      .select("balance status history username");
    console.log(account);
  },

  getPendingTransaction: async (req, res) => {
    const accessToken = req.cookies.accessToken;
    const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
    const user = await User.findOne({
      username: verifyToken.data.username,
    }).lean();
    if (req.query.search == "true") {
      Transaction.find(generateSearchTransactionFilter(req))
        .sort({ transactionDate: 1 })
        .lean()
        .exec((err, result) => {
          if (err !== null) {
            res.redirect("/admin/transactionApproval");
          } else {
            let noData = {
              status: true,
              msg: "Không có kết quả",
            };
            if (result.length >= 1) {
              result.forEach((transaction) => {
                transaction.transactionDate = transaction["transactionDate"]
                  .toLocaleString("en-GB")
                  .replace(",", " -");
                transaction.transactionAmount = toMoney(
                  transaction.transactionAmount
                );
              });
              noData.status = false;
            }
            return res.render("transactionApproval", {
              layout: "admin",
              user,
              noData: noData,
              pendingTransaction: result,
            });
          }
        });
    } else {
      Transaction.find({ status: "Pending" })
        .sort({ transactionDate: 1 })
        .lean()
        .exec((err, result) => {
          let noData = {
            status: true,
            msg: "Không có giao dịch cần duyệt",
          };
          if (result.length >= 1) {
            result.forEach((transaction) => {
              transaction.transactionDate = transaction["transactionDate"]
                .toLocaleString("en-GB")
                .replace(",", " -");
              transaction.transactionAmount = toMoney(
                transaction.transactionAmount
              );
            });
            noData.status = false;
          }
          return res.render("transactionApproval", {
            layout: "admin",
            user,
            noData: noData,
            pendingTransaction: result,
          });
        });
    }
  },

  acceptPendingTransaction: async (req, res) => {
    try {
      Transaction.findById(
        { _id: new ObjectId(`${req.params.transactionID.toString()}`) },
        (err, result) => {
          if (err !== null) {
            throw "Xảy ra lỗi trong quá trình tìm giao dịch.";
          } else {
            Account.findOne({ username: result.userID }, (err, userData) => {
              if (err !== null) {
              }
              console.log(userData);
              if (userData.balance >= result.transactionAmount) {
                Account.updateOne(
                  { username: userData.username },
                  { $inc: { balance: result.transactionAmount * -1 } },
                  (err, response) => {
                    if (err !== null || result["modifiedCount"] < 1) {
                      error.isError = true;
                      error.errorMessage =
                        "Có lỗi xảy ra trong quá trình thực hiện. Vui lòng thử lại.<br>";
                      return backToInputForm(
                        "deposit",
                        user,
                        res,
                        error,
                        dataBag
                      );
                    }
                  }
                );
              } else {
                console.log("less");
              }
            });
          }
        }
      );
      // console.log(pendingWithdraw.obj)
    } catch (error) {
      console.log(error);
    }
  },

  searchPendingTransaction: (req, res) => {
    if (req.query.search == "true") {
      Transaction.find(generateSearchTransactionFilter(req))
        .sort({ transactionDate: 1 })
        .lean()
        .exec((err, result) => {
          if (err !== null) {
            return res.json({ msg: "Xảy ra lỗi trong quá trình tìm kiếm" });
          } else {
            if (result.length >= 1) {
              result.forEach((transaction) => {
                transaction.transactionDate = transaction["transactionDate"]
                  .toLocaleString("en-GB")
                  .replace(",", " -");
                transaction.transactionAmount = toMoney(
                  transaction.transactionAmount
                );
              });
              return res.json({ dataFound: result.length, result });
            } else {
              return res.json({ msg: "Không có kết quả" });
            }
          }
        });
    } else {
      return res.json({ msg: "Tìm kiếm không hợp lệ" });
    }
  },

  searchPendingUser: async (req, res) => {
    if (req.query.search == "true") {
      let account = await Account.find({ status: "pending" })
        .lean()
        .select("username");
      let pendingAccount = [];

      account.forEach((user) => {
        pendingAccount.push(user.username);
      });
      User.find({
        $and: [
          { username: { $in: pendingAccount } },
          generateSearchUserFilter(req),
        ],
      })
        .lean()
        .exec((err, result) => {
          if (err !== null) {
            return res.json({ msg: "Xảy ra lỗi trong quá trình tìm kiếm" });
          } else {
            if (result.length >= 1) {
              return res.json({ dataFound: result.length, result });
            } else {
              return res.json({ msg: "Không có kết quả" });
            }
          }
        });
    } else {
      return res.json({ msg: "Tìm kiếm không hợp lệ" });
    }
  },
};

module.exports = adminController;

function toMoney(moneyamount, style = "VND") {
  return (
    parseFloat(moneyamount).toLocaleString("en-US", {
      maximumFractionDigits: 2,
    }) +
    " " +
    style
  );
}

function generateSearchTransactionFilter(req) {
  let filter = {
    transactionType: "Withdraw",
    status: "Pending",
  };
  if (req.query.ID) {
    filter.userID = req.query.ID;
  }
  if (req.query.from && req.query.to) {
    filter.transactionDate = {
      $gte: new Date(req.query.from),
      $lt: new Date(req.query.to),
    };
  } else if (req.query.from && !req.query.to) {
    filter.transactionDate = { $gte: new Date(req.query.from) };
  } else if (!req.query.from && req.query.to) {
    filter.transactionDate = { $lt: new Date(req.query.to) };
  }
  if (req.query.amount && req.query.amount >= 5) {
    let realAmount = req.query.amount * 1000000;
    filter.transactionAmount = { $gte: realAmount };
  }

  return filter;
}

function generateSearchUserFilter(req) {
  let filter = {};
  if (req.query.searchString && req.query.searchType == 1) {
    filter.username = req.query.searchString;
  } else if (req.query.searchString && req.query.searchType == 2) {
    filter.phoneNumber = req.query.searchString;
  } else if (req.query.searchString && req.query.searchType == 3) {
    filter.email = req.query.searchString;
  }
  return filter;
}
