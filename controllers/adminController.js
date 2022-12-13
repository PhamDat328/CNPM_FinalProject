const User = require("../models/User");
const Account = require("../models/Account");
const jwt = require("jsonwebtoken");
const Transaction = require("../models/History");
const { ObjectId } = require("mongodb");
const Product = require("../models/Products");
const Order = require("../models/Orders")
const async = require("hbs/lib/async");
const adminController = {


  getHomepage: async (req,res) => {
    const accessToken = req.cookies.accessToken;
    const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
    const user = await User.findOne({
      username: verifyToken.data.username,
    }).lean();
    let userLength = (await User.find({})).length
    let productLength = (await Product.find({})).length
    let orderLength = (await Order.find({})).length 
    return res.render("adminHomepage", {layout:"admin",user ,userLength,productLength,orderLength})
  },

  getProduct: async (req, res) => {
    const accessToken = req.cookies.accessToken;
    const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
    const user = await User.findOne({
      username: verifyToken.data.username,
    }).lean();

    let product = await Product.find({}).lean();

    if (req.query.search == "true") {
      Product.find(generateSearchProductFilter(req))
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
              products: result,
            });
          }
        });
    } else {
      Product.find({})
        .lean()
        .exec((err, result) => {
          let noData = {
            status: true,
            msg: "Không có kết quả",
          };

          if (result.length >= 1) {
            result.forEach((product) => {
              product.product_price = toMoney(product.product_price);
            });
            noData.status = false;
          }
          return res.render("pending", {
            layout: "admin",
            user,
            noData: noData,
            products: result,
          });
        });
    }
  },

  getChooseToAdd: async (req, res) => {
  
    // if (!req.session.isLogin) {
    //   return res.redirect("/login");
    // } else {
      const accessToken = req.cookies.accessToken;
      const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
      let user = await User.findOne({ username: verifyToken.data.username });
      return res.render("addOption", {
        title: "GreenVN",
        layout: "admin",
        user: user.toObject(),
        newProductButton: true,
      });
    //}
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

  getProductDetail: async (req, res) => {
    try {
      const product = await Product.findOne({
        product_id: req.params.product_id,
      }).lean();

      const keys = Object.keys(product.product_detail);

      keys.forEach((el) => {
        product.product_detail.keys = el.toUpperCase();
      });

      res.render("accountDetail", { layout: "admin", product });
    } catch (error) {
      console.log(error);
    }
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

  searchProducts: async (req, res) => {
    if (req.query.search == "true") {
      Product.find(generateSearchProductFilter(req))
        .lean()
        .exec((err, result) => {
          if (err !== null) {
            console.log(err);
            return res.json({ msg: "Xảy ra lỗi trong quá trình tìm kiếm" });
          } else {
            if (result.length >= 1) {
              result.forEach((product) => {
                product.product_price = toMoney(product.product_price);
              });

              return res.json({ dataFound: result.length, result });
            } else {
              return res.json({ msg: "Không có kết quả" });
            }
          }
        });
      /* let pendingAccount = [];

      account.forEach((user) => {
        pendingAccount.push(user.username);
      }); */
    } else {
      return res.json({ msg: "Tìm kiếm không hợp lệ" });
    }
  },

  getAddLaptop:async(req,res) => {
    const accessToken = req.cookies.accessToken;
    const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
    const user = await User.findOne({
      username: verifyToken.data.username,
    }).lean();
    
    return res.render("addLaptopForm", {layout:"admin",user,preCategoryID:"c00001"})
  },

  postAddLaptopForm: async(req,res) => {
    const accessToken = req.cookies.accessToken;
    const verifyToken = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
    const user = await User.findOne({
      username: verifyToken.data.username,
    }).lean();

    let product_id ="p" + (await Product.find({})).length +1

    let product_detail = {

      cpu: req.body.CPU,
      ram:req.body.RAM,
      hardDisk:req.body.HardDisk,
      VGA:req.body.VGA,
      monitor:req.body.Monitor,
      port: req.body.Port,
      opticalDrive: req.body.OpticalDrive,
      audio: req.body.Audio,
      keyboard:req.body.keyboard,
      memoryReader:req.body.MemoryReader,
      LAN: req.body.LAN,
      WIFI:req.body.WIFI,
      Bluetooth: req.body.Bluetooth,
      Webcam: req.body.Webcam,
      OS: req.body.OS,
      pin: req.body.pin,
      weight: req.body.weight,
      color: req.body.color,
      size: req.body.size,

    }
    let product_images =[req.body.link1,req.body.link2,req.body.link3,req.body.link4,req.body.link5,req.body.link6]
    Product.create({product_id: product_id, category_id:req.body.categoryID, product_name: req.body.productName, product_price: req.body.price, product_images,product_detail})
    return res.redirect("/admin/products")
  }
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
  if (req.query.amount) {
    let realAmount = req.query.amount * 1000000;
    filter.transactionAmount = { $gte: realAmount };
  }

  return filter;
}

function generateSearchProductFilter(req) {
  let filter = {};
  if (req.query.searchString && req.query.searchType == 1) {
    filter.product_id = req.query.searchString;
  } else if (req.query.searchString && req.query.searchType == 2) {
    filter.$text = { $search: `${req.query.searchString}` };
  } else if (req.query.searchString && req.query.searchType == 3) {
    filter.category_id = req.query.searchString;
  }
  if (req.query.amount) {
    let realAmount = req.query.amount * 1000000;
    filter.product_price = { $gte: realAmount };
  }
  console.log(filter);
  return filter;
}
