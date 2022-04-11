const { mongoose } = require("mongoose");

var userSchema = new mongoose.Schema(
    {
        userName: { type: String },
        userEmail: { type: String },
        date: { type: String },
        questionLink: { type: Array }
    }
);

module.exports = mongoose.model("userdetail", userSchema);