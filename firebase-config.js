// Firebase Configuration
// Replace these values with your Firebase project credentials

const firebaseConfig = {

  apiKey: "AIzaSyDRWhl0WokFUaekp90vY58n7IOPkTcNNTo",

  authDomain: "familyss-bcdec.firebaseapp.com",

  databaseURL: "https://familyss-bcdec-default-rtdb.europe-west1.firebasedatabase.app",

  projectId: "familyss-bcdec",

  storageBucket: "familyss-bcdec.firebasestorage.app",

  messagingSenderId: "46284215616",

  appId: "1:46284215616:web:9611c7114481bcae5d56a5"

};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get database reference
const database = firebase.database();

// Export for use in other files
window.db = database;
