const {mongoose} = require("mongoose");

var questionSchema = new mongoose.Schema(
    {
      link: {type: String},
      heading: {type: String},
      description: {type: String},
    }
  );

module.exports = mongoose.model("questiondescriptions", questionSchema);