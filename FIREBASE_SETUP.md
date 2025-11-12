# Firebase Setup Guide

This guide will help you set up Firebase for your Team Spinner application.

## Prerequisites

- A Google account
- The Team Spinner application code

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" (or "Create a project")
3. Enter a project name (e.g., "Team Spinner")
4. Click "Continue"
5. (Optional) You can disable Google Analytics for now if you don't need it
6. Click "Create project"
7. Wait for the project to be created, then click "Continue"

## Step 2: Register Your Web App

1. In your Firebase project dashboard, click the web icon (`</>`) to add a web app
2. Enter an app nickname (e.g., "Team Spinner Web")
3. You can check "Also set up Firebase Hosting" if prompted (we'll configure this later)
4. Click "Register app"
5. You'll see a configuration object - **keep this page open, you'll need these values soon**

The config will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 3: Enable Email/Password Authentication

1. In the left sidebar, click "Build" > "Authentication"
2. Click "Get started"
3. Click on the "Sign-in method" tab
4. Click on "Email/Password"
5. Enable the first toggle (Email/Password)
6. You can leave "Email link (passwordless sign-in)" disabled
7. Click "Save"

## Step 4: Create Firestore Database

1. In the left sidebar, click "Build" > "Firestore Database"
2. Click "Create database"
3. Select "Start in production mode" (we'll set up rules next)
4. Click "Next"
5. Choose your Cloud Firestore location (pick one close to your users)
6. Click "Enable"

## Step 5: Configure Firestore Security Rules

1. Once your database is created, click on the "Rules" tab
2. Replace the existing rules with the following:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click "Publish"

These rules ensure that:
- Users must be authenticated to access data
- Users can only read/write their own team and history data

## Step 6: Update Your Application Config

1. Open `src/config/firebase.config.ts` in your code editor
2. Replace the placeholder values with your Firebase config from Step 2:

```typescript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

**Important**: Replace ALL the placeholder values with your actual Firebase credentials.

## Step 7: Build and Test Locally

1. Save all your changes
2. Build the application:
   ```bash
   npm run build
   ```
3. Test locally:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:5173/`
5. Try registering a new account
6. Add some team members
7. Spin the wheel
8. Check that your data persists when you refresh the page

## Step 8: Deploy to Firebase Hosting

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Add Firebase configuration"
   git push origin main
   ```
2. Follow the deployment instructions in the main [README.md](README.md#deployment-to-firebase-hosting-recommended)
3. Your site will be automatically deployed via GitHub Actions
4. Visit your deployed site at `https://YOUR-PROJECT-ID.web.app`

## Troubleshooting

### "No authenticated user" error
- Make sure you're logged in
- Check the browser console for any Firebase errors
- Verify your Firebase credentials are correct in `firebase.config.ts`

### Data not persisting
- Check Firestore security rules are set correctly
- Verify you're authenticated (check for user email in dashboard)
- Look at the Firestore console to see if documents are being created

### Authentication errors
- Verify Email/Password authentication is enabled in Firebase Console
- Check that your Firebase config credentials match your project
- Look at browser console for specific error codes

### Build errors
- Make sure you've run `npm install` after pulling changes
- Check that all Firebase credentials are strings (wrapped in quotes)
- Verify TypeScript types are correct

## Security Notes

**Important**: Your Firebase config values (apiKey, projectId, etc.) are safe to commit to your repository and deploy publicly. They are not secret keys. Security is enforced by:

1. Firestore Security Rules (set in Step 5)
2. Firebase Authentication (users must be logged in)

However, you may want to:
- Monitor your Firebase usage in the Firebase Console
- Set up billing alerts to avoid unexpected charges
- Review authentication logs periodically

## Next Steps

Once Firebase is set up:
- Invite team members to register accounts
- Each user will have their own private team data
- Data syncs across all devices where the user is logged in
- No more lost data when clearing browser cache!

## Support

If you encounter issues:
1. Check the [Firebase Documentation](https://firebase.google.com/docs)
2. Review the browser console for error messages
3. Check the Firestore Console to see if data is being written
4. Verify all Firebase services are enabled (Authentication, Firestore)
