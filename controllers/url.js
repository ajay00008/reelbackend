const shortid = require("shortid");
const URL = require("../models/Url");
const { validationResult } = require("express-validator");

async function handleGenerateNewShortURL(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false, errors: errors.errors[0].msg,
            message: "validation error",
        });
    }
    const {username , url}=req.body
    try {
        const shortID = shortid();

        const result = await URL.findOneAndUpdate(
            { username: username },
            { $set: { redirectURL: url, shortId: shortID } },
            { upsert: true, new: true }
        );

        return res.json({ id: result.username , data: result, success: true });
    } catch (error) {
        console.log(error, "error: createurl")
        return res.status(500).json({ success: false, error: error });
    }
}

async function handleGetAnalytics(req, res) {
    const username = req.params.username;
    const result = await URL.findOne({ username });
    return res.json({
        totalClicks: result.visitHistory.length,
        analytics: result.visitHistory,
    });
}

module.exports = {
    handleGenerateNewShortURL,
    handleGetAnalytics,
};
