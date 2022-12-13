const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");


router.route("/").get(adminController.getHomepage)

router
  .route("/products")
  .get(adminController.getProduct)
  .post(adminController.searchProducts);


router.route("/newproduct").get(adminController.getChooseToAdd);
router.route("/newproduct/laptop").get(adminController.getAddLaptop).post(adminController.postAddLaptopForm);
router.route("/newproduct/mouse").get(adminController.getAddLaptop);
router.route("/newproduct/headphone").get(adminController.getAddLaptop);
router.route("/newproduct/chair").get(adminController.getAddLaptop);
router.route("/newproduct/monitor").get(adminController.getAddLaptop);


router
  .route("/productDetail/:product_id")
  .get(adminController.getProductDetail);

router
  .route("/transactionApproval")
  .get(adminController.getPendingTransaction)
  .post(adminController.searchPendingTransaction);
router
  .route("/transaction/accepted/:transactionID")
  .post(adminController.acceptPendingTransaction);
module.exports = router;
