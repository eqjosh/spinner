# Team Spinner

A web application for randomly selecting team members with a roulette wheel interface. Built with React, TypeScript, and Tailwind CSS.

## Features

### 1. Login Screen
- Real Firebase Authentication with email/password
- User registration and login
- Session persists across devices and browsers

### 2. Spinner (Roulette Wheel)
- Animated roulette wheel to randomly select team members
- Optional label for each spin (e.g., "Sprint Demo", "Code Review")
- Automatically excludes members who were selected in the last 30 days
- Only shows active team members
- Visual feedback with colored wheel segments

### 3. History
- View all past spins with dates and winners
- Add or edit labels for each spin
- Click to allow recently selected members to be eligible again (overrides 30-day rule)
- Shows remaining days until member becomes eligible again

### 4. Team Admin
- Add, edit, and delete team members
- Upload optional photos for each member (stored as base64 in Firestore)
- Temporarily deactivate/reactivate members (e.g., for vacation)
- Visual cards showing member status
- Each user manages their own private team data

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v3
- **Authentication**: Firebase Authentication (Email/Password)
- **Database**: Cloud Firestore (NoSQL database)
- **Deployment**: Firebase Hosting

## Local Development

### Prerequisites
- Node.js 18+ and npm
- A Firebase project (see [Firebase Setup Guide](FIREBASE_SETUP.md))

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Firebase:
   - Follow the [Firebase Setup Guide](FIREBASE_SETUP.md) to create your Firebase project
   - Update `src/config/firebase.config.ts` with your Firebase credentials

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

The built files will be in the `dist/` directory.

## Deployment to Firebase Hosting (Recommended)

Firebase Hosting is the best choice since you're already using Firebase for authentication and database. It's free, fast, and integrates seamlessly with your Firebase services.

### Benefits
- **Free tier**: 10 GB storage, 360 MB/day bandwidth
- **Global CDN**: Fast content delivery worldwide
- **HTTPS**: Free SSL certificate included
- **Auto-deploy**: GitHub Actions workflow included
- **Same ecosystem**: Colocated with your Firebase database

### Initial Setup (One-time)

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Get your Firebase Project ID**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click on your project
   - Copy the Project ID from the project settings

4. **Update configuration files**:
   - Edit `.firebaserc` and replace `your-project-id-here` with your actual Firebase Project ID
   - Edit `.github/workflows/firebase-hosting.yml` and replace `your-project-id-here` with your actual Project ID

5. **Set up GitHub Actions** (for auto-deployment):
   ```bash
   # Generate a service account key
   firebase init hosting:github
   ```
   This will:
   - Set up the GitHub Actions workflow
   - Create a `FIREBASE_SERVICE_ACCOUNT` secret in your GitHub repository
   - Enable automatic deployments on push to main branch

### Manual Deployment

To deploy manually from your local machine:

```bash
# Build the application
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Your site will be live at: `https://YOUR-PROJECT-ID.web.app`

### Automatic Deployment (Recommended)

The included GitHub Actions workflow (`.github/workflows/firebase-hosting.yml`) automatically deploys your site when you push to the main branch.

**Setup Steps**:
1. Run `firebase init hosting:github` (as shown above)
2. Push your code to GitHub
3. Every push to `main` branch will automatically deploy

### Custom Domain (Optional)

1. Go to Firebase Console > Hosting
2. Click "Add custom domain"
3. Follow the instructions to verify domain ownership
4. Firebase will automatically provision an SSL certificate

### View Your Site

- **Firebase domain**: `https://YOUR-PROJECT-ID.web.app`
- **Alternative**: `https://YOUR-PROJECT-ID.firebaseapp.com`
- **Custom domain**: Your own domain (if configured)

**Important**: Make sure your Firebase configuration is set up in `src/config/firebase.config.ts` before deploying!

## Data Storage

All data is stored in Firebase Cloud Firestore:
- **Authentication**: Firebase Authentication with email/password
- **Team members**: Stored in user-specific subcollection (including base64-encoded photos)
- **Spin history**: Stored in user-specific subcollection

**Benefits**:
- Data persists across all devices and browsers
- Secure authentication with Firebase
- Each user has their own private data
- Data survives browser cache clears
- Access your team from anywhere with your login

**Security**:
- Firestore security rules ensure users can only access their own data
- Firebase Authentication manages secure login sessions

## Future Enhancements

- Export/import team data (CSV/JSON)
- Email notifications when selected
- Statistics and analytics dashboard
- Team sharing and collaboration features
- Mobile app version (React Native)
- Customizable wheel colors and themes

## License

MIT
