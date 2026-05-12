const admin = require("firebase-admin");

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Load from Hugging Face Secret
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Fallback to local file
  serviceAccount = require("../firebase-admin-key.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Make sure you are exporting the whole admin object
module.exports = admin;