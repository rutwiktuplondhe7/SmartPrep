const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profileImageUrl: { type: String, default: null },

   // for limiting API usage
    aiUsage: {
      createSession: { type: Number, default: 0 },
      loadMoreQuestions: { type: Number, default: 0 },
      learnMore: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
