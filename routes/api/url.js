const express = require("express");
const {
  handleGenerateNewShortURL,
  handleGetAnalytics,
} = require("../../controllers/url");
const { urlValidator} = require("../../utils/validators/urlValidator");

const router = express.Router();

router.post("/", urlValidator , handleGenerateNewShortURL);

router.get("/analytics/:username", handleGetAnalytics);

module.exports = router;