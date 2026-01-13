# Secret Santa Multi-User Setup Guide

## Firebase Setup Instructions

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "Family Secret Santa")
4. Disable Google Analytics (optional for this project)
5. Click "Create project"

### Step 2: Enable Realtime Database

1. In your Firebase project dashboard, click on "Realtime Database" in the left sidebar
2. Click "Create Database"
3. Choose a location (select the closest to your family members)
4. **Security Rules:** Start in **test mode** for initial setup
   - This allows read/write access for 30 days
   - We'll update the rules later for better security

### Step 3: Get Your Firebase Config

1. Click on the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon `</>` to add a web app
5. Give it a nickname (e.g., "Secret Santa Web")
6. **Don't** check "Firebase Hosting" (we don't need it)
7. Click "Register app"
8. You'll see a config object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Step 4: Update firebase-config.js

1. Open `firebase-config.js` in this folder
2. Replace the placeholder values with your actual Firebase config values:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",                    // Replace this
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",  // Replace this
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",  // Replace this
    projectId: "YOUR_PROJECT_ID",              // Replace this
    storageBucket: "YOUR_PROJECT_ID.appspot.com",  // Replace this
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",  // Replace this
    appId: "YOUR_APP_ID"                       // Replace this
};
```

### Step 5: Update Security Rules (CRITICAL!)

**IMPORTANT:** This is your actual security layer. The API key being visible is OK - the security comes from these rules!

1. Go to Firebase Console → Realtime Database → Rules tab
2. Copy the contents from `firebase-rules.json` file
3. Paste and publish

**What These Rules Do:**
- ✅ Anyone can read session data (needed for participants)
- ✅ Anyone can create new sessions (one-time only)
- ✅ Anyone can join as participant
- 🔒 **ONLY organizer with admin key can create assignments** (prevents cheating!)
- 🔒 **ONLY organizer can change session status** (prevents unauthorized draws)
- ✅ Anyone can set restrictions (but organizer manages via UI)

**Security Note:**
- Your Firebase API key in `firebase-config.js` is **meant to be public**
- Google officially says this is safe
- Real security = Firebase Rules (above) + Admin key verification
- Even if someone sees your API key, they can't cheat or see others' assignments

## How to Use the Application

### For the Organizer (Admin Only):

**IMPORTANT:** Only you (the admin) can create sessions. Family members will only see the join page.

1. **Access Admin URL:** Open `index.html?role=admin` in your web browser
   - Example: `file:///F:/Programmables/FamilySecretSanta/index.html?role=admin`
   - Or if hosted: `https://yoursite.com/index.html?role=admin`
   - **Bookmark this URL** for future use!
2. **Enter** session name (e.g., "عائلة 2026") and your name
3. **Click** "إنشاء" (Create)
4. **Copy** the participant link from the dashboard
5. **Share** the link via WhatsApp/Telegram or manually
6. **Wait** for family members to join (they'll appear in real-time)
7. **Set restrictions** (optional):
   - Check boxes next to names for people who shouldn't draw each other
   - Example: "Ahmed cannot draw Sara or Layla"
8. **Exclude/Include** participants as needed:
   - Click "استبعاد" (Exclude) to temporarily remove someone from the draw
   - Click "تضمين" (Include) to add them back
9. **Click** "بدء السحب" (Start Draw) when ready
10. **Monitor progress** - watch as participants draw their names in real-time

### For Participants:

1. **Open** the link shared by the organizer
2. **Enter your name** in the input field
3. **Click** "انضم الآن" (Join Now)
4. **Wait** for the organizer to start the draw
   - You'll see "جاري الانتظار..." (Waiting...)
   - If excluded, you'll see "يرجى الانتظار" (Please wait)
5. **When ready**, click "اسحب الآن" (Draw Now)
6. **See your assignment** with confetti celebration! 🎉
7. **Click** "نسخ النتيجة" (Copy Result) to save your assignment

## Features

✨ **Multi-User Support**
- Real-time synchronization via Firebase
- Multiple people can join simultaneously
- Live updates for organizer dashboard

🎭 **Role-Based Views**
- Organizer: Full control panel
- Participants: Simple, privacy-focused view

🚫 **Flexible Restrictions**
- Prevent specific pairings (e.g., brothers-in-law ↔ sisters-in-law)
- Temporary exclusions (organizer can exclude/re-include participants)

🎨 **Clean Modern Theme**
- Light, sophisticated interface
- Professional blue color scheme
- Subtle animations and confetti celebrations

📱 **Mobile Friendly**
- Works on all devices
- Touch-optimized interface
- Responsive design

🔗 **Easy Sharing**
- Copy link button
- WhatsApp integration
- Telegram integration

## Troubleshooting

**"حدث خطأ في إنشاء الجلسة" (Error creating session)**
- Check that you've updated `firebase-config.js` with your actual Firebase credentials
- Verify your internet connection
- Check browser console for specific error messages

**"الجلسة غير موجودة" (Session doesn't exist)**
- Verify the URL contains the correct session ID
- Check that the organizer created the session successfully

**Participants not appearing in real-time**
- Check internet connection
- Verify Firebase Realtime Database is enabled
- Check security rules allow read/write access

**"لا يمكن إجراء السحب. القيود متضاربة جداً" (Cannot perform draw - too many restrictions)**
- You've set too many restrictions making a valid assignment impossible
- Remove some restrictions and try again
- Example: If everyone is restricted from everyone else, no assignment is possible

## Hosting Online (Deploy to the Web)

### Option 1: GitHub Pages (Free & Simple) ⭐ RECOMMENDED

**Step-by-Step:**

1. **Create GitHub Account** (if you don't have one)
   - Go to [github.com](https://github.com) and sign up

2. **Create New Repository**
   - Click "+" in top right → "New repository"
   - Name: `FamilySecretSanta` (or any name you want)
   - Make it **Public** (required for free GitHub Pages)
   - Click "Create repository"

3. **Upload Your Files**
   - Click "uploading an existing file"
   - Drag ALL your files:
     - `index.html`
     - `admin.html`
     - `script.js`
     - `firebase-config.js`
     - `style.css`
   - Click "Commit changes"

4. **Enable GitHub Pages**
   - Go to repository Settings → Pages (left sidebar)
   - Source: "Deploy from a branch"
   - Branch: Select `main` and `/root`
   - Click "Save"

5. **Get Your URL**
   - Wait 1-2 minutes
   - Your site will be at: `https://yourusername.github.io/FamilySecretSanta/`
   - **Admin URL:** `https://yourusername.github.io/FamilySecretSanta/admin.html`

**Security Note:**
- ✅ Your Firebase API key will be visible in the code - **this is completely safe!**
- 🔒 Security comes from Firebase Rules, not hiding the API key
- ✅ Your admin key (generated per session) is still private

**To Update Your Site:**
- Just upload new files to GitHub and they'll update automatically

---

### Option 2: Netlify (Easiest - Drag & Drop)

1. Go to [netlify.com](https://www.netlify.com/) and sign up (free)
2. Click "Add new site" → "Deploy manually"
3. **Drag your entire folder** into the browser
4. Done! You get: `https://your-site-name.netlify.app`

**Admin URL:** `https://your-site-name.netlify.app/admin.html`

---

### Option 3: Firebase Hosting (If Using Firebase)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize in your folder
cd "f:\Programmables\FamilySecretSanta"
firebase init hosting

# When prompted:
# - Select your project: familyss-bcdec
# - Public directory: . (dot = current directory)
# - Single page app: No
# - Don't overwrite files: No

# Deploy
firebase deploy --only hosting
```

Your site: `https://familyss-bcdec.web.app/`
**Admin URL:** `https://familyss-bcdec.web.app/admin.html`

## Support

For issues or questions:
- Check browser console for errors
- Verify Firebase configuration
- Ensure all files are in the same directory

## Privacy & Data

- All data is stored in your personal Firebase project
- Only people with the session link can join
- Assignments are encrypted in Firebase
- No data is shared with third parties
- You can delete sessions from Firebase Console anytime

---

**Built with:** Firebase Realtime Database, Vanilla JavaScript, Arabic RTL Support

**Theme:** Victorian English with Dark Gold Aesthetics
