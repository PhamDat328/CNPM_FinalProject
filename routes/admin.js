const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");


router.route("/").get(adminController.getHomepage)

router
  .route("/products")
  .get(adminController.getProduct)
  .post(adminController.searchProducts);
router.route("/activated/:username").post(adminController.activated);
router.route("/cancel/:username").post(adminController.disabled);
router.route("/addInfo/:username").post(adminController.addInfo);

router.route("/activated").get(adminController.getActive);
router.route("/disabled").get(adminController.getDisabled);
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
