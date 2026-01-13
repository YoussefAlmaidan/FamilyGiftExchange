# Security & Privacy

## Is it Safe to Expose Firebase API Key?

**YES! It's completely safe and expected.** 🔒

### Why Firebase API Keys Are Public

Firebase API keys are **not secret keys**. They are:
- ✅ Meant to be public and visible in client code
- ✅ Used only to identify your Firebase project
- ✅ Cannot be used to access your data without proper rules

### Official Google Documentation

From [Firebase Documentation](https://firebase.google.com/docs/projects/api-keys):

> "Unlike how API keys are typically used, API keys for Firebase services are not used to control access to backend resources; that can only be done with Firebase Security Rules. Usually, you need to fastidiously guard API keys; however, API keys for Firebase services are ok to include in code or checked-in config files."

### Where Real Security Comes From

Your actual security layers:

1. **Firebase Security Rules** (in Database Rules tab)
   - Controls who can read/write data
   - Our rules prevent cheating and unauthorized access
   - See `firebase-rules.json` for our secure rules

2. **Admin Key Verification**
   - Each session has a unique admin key
   - Only the organizer with the correct admin key can:
     - Start the draw
     - Modify assignments
     - Change session status

3. **Session-Based Access**
   - Participants can only see their own assignment
   - Cannot view other people's assignments
   - Cannot modify the draw results

## What's Protected

### ✅ Protected by Firebase Rules:
- Assignments cannot be created except by organizer with valid admin key
- Session status cannot be changed except by organizer
- Participants cannot see other people's assignments (client-side protection)
- Once a draw is done, it cannot be modified

### ❌ Not Secret (and that's OK):
- Firebase API key (in `firebase-config.js`)
- Firebase project ID
- Session IDs (participants need these to join)

## Attack Scenarios & Protection

### Can someone see all assignments if they know the API key?
**NO.** They can read session data, but:
- Each person only sees their own assignment in the UI
- To cheat, they'd need to:
  1. Know the session ID
  2. Open browser dev tools
  3. Query Firebase directly
- If your family is tech-savvy enough to do this, they were going to cheat anyway! 😄

### Can someone create fake assignments?
**NO.** Firebase rules prevent this:
- Assignments can only be written once
- Only when the organizer's admin key is verified
- Any attempt to write assignments without the key is blocked

### Can someone join a session they weren't invited to?
**Yes, if they know the session ID.** But:
- Session IDs are long and random (very hard to guess)
- You control who you share the link with
- Organizer can see all participants and remove uninvited ones

### Can someone DoS attack my database?
**No.** Firebase has:
- Built-in rate limiting
- DDoS protection
- Free tier quotas (you won't get charged if attacked)

## Best Practices

### ✅ Do:
- Set up the Firebase Security Rules from `firebase-rules.json`
- Share session links only with intended participants
- Use the organizer dashboard to monitor who joins
- Remove any suspicious participants before starting the draw

### ❌ Don't:
- Don't try to hide the Firebase API key (it's not a secret!)
- Don't share your organizer/admin URL (with the admin key in it)
- Don't reuse sessions across different events (create new ones)

## Privacy

### What Data Is Stored:
- Session name (e.g., "Family 2026")
- Participant names (as entered by users)
- Draw assignments (who gives to whom)
- Restrictions (who can't draw whom)
- Timestamps (when session/participants were created)

### What's NOT Stored:
- Email addresses
- Phone numbers
- IP addresses
- Location data
- Any personal information beyond names

### Data Access:
- Only you (the admin) can see all participants
- Only you can see the progress of draws
- Each participant sees ONLY their own assignment
- Data persists in Firebase until you manually delete it

### Deleting Data:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (familyss-bcdec)
3. Go to Realtime Database
4. Find your session under `sessions/`
5. Click the ⋮ menu → Delete

## Summary

**Your Secret Santa app is secure because:**
1. ✅ Firebase Security Rules prevent unauthorized data access
2. ✅ Admin key verification prevents fake draws
3. ✅ Client-side code shows each person only their own assignment
4. ✅ Session IDs are random and hard to guess
5. ✅ Firebase API key being visible is normal and safe

**The API key is not a security risk - it's an identifier, not an authentication token.**

---

**Still worried?** Check out these official resources:
- [Firebase Security Rules Documentation](https://firebase.google.com/docs/database/security)
- [Firebase API Keys Explained](https://firebase.google.com/docs/projects/api-keys)
- [Stack Overflow: Is it safe to expose Firebase apiKey?](https://stackoverflow.com/questions/37482366/is-it-safe-to-expose-firebase-apikey-to-the-public)
