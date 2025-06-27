const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ["male", "female", "other"], required: true },
  password: { type: String, required: true },
  profile: { type: String }
}, {
  versionKey: false
});

module.exports = mongoose.model("User", userSchema);
