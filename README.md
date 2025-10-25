# Team Spinner

A web application for randomly selecting team members with a roulette wheel interface. Built with React, TypeScript, and Tailwind CSS.

## Features

### 1. Login Screen
- Simple authentication (demo mode - accepts any username/password)
- Session persists in LocalStorage

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
- Upload optional photos for each member (stored as base64 in LocalStorage)
- Temporarily deactivate/reactivate members (e.g., for vacation)
- Visual cards showing member status

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Storage**: LocalStorage (all data persists in the browser)
- **Deployment**: Static site ready for AWS S3

## Local Development

### Prerequisites
- Node.js 18+ and npm

### Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

The built files will be in the `dist/` directory.

## Deployment to AWS S3

### Step 1: Build the Application

```bash
npm run build
```

This creates a production-ready build in the `dist/` directory.

### Step 2: Create an S3 Bucket

1. Go to AWS S3 Console
2. Click "Create bucket"
3. Choose a unique bucket name (e.g., `team-spinner-app`)
4. Choose your preferred region
5. **Uncheck** "Block all public access" (we need public access for static hosting)
6. Click "Create bucket"

### Step 3: Enable Static Website Hosting

1. Go to your bucket
2. Click the "Properties" tab
3. Scroll to "Static website hosting"
4. Click "Edit"
5. Select "Enable"
6. Index document: `index.html`
7. Error document: `index.html` (for SPA routing)
8. Click "Save changes"

### Step 4: Configure Bucket Policy

1. Go to the "Permissions" tab
2. Scroll to "Bucket policy"
3. Click "Edit"
4. Add the following policy (replace `YOUR-BUCKET-NAME` with your actual bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

5. Click "Save changes"

### Step 5: Upload Files

#### Option A: Using AWS Console

1. Go to the "Objects" tab
2. Click "Upload"
3. Click "Add files" or drag and drop all files from the `dist/` folder
4. Click "Upload"

#### Option B: Using AWS CLI

```bash
# Install AWS CLI if you haven't already
# Configure AWS CLI with your credentials
aws configure

# Sync the dist folder to your S3 bucket
aws s3 sync dist/ s3://YOUR-BUCKET-NAME/ --delete

# Set proper content types
aws s3 cp dist/ s3://YOUR-BUCKET-NAME/ \
  --recursive \
  --content-type-preset
```

### Step 6: Access Your Application

1. Go to the "Properties" tab
2. Scroll to "Static website hosting"
3. Copy the "Bucket website endpoint" URL
4. Open it in your browser

Example URL: `http://YOUR-BUCKET-NAME.s3-website-REGION.amazonaws.com`

### Optional: Set Up CloudFront for HTTPS

For HTTPS and better performance:

1. Go to AWS CloudFront Console
2. Click "Create Distribution"
3. Origin Domain: Select your S3 bucket
4. Origin Path: Leave empty
5. Enable "Use website endpoint" if available
6. Viewer Protocol Policy: "Redirect HTTP to HTTPS"
7. Default Root Object: `index.html`
8. Create distribution
9. Wait for deployment (can take 10-15 minutes)
10. Use the CloudFront domain name (supports HTTPS)

### Optional: Custom Domain

1. Register or use existing domain in Route 53
2. Create SSL certificate in AWS Certificate Manager (ACM)
3. Add custom domain to CloudFront distribution
4. Create Route 53 A record pointing to CloudFront

## Data Storage

All data is stored in the browser's LocalStorage:
- Authentication state
- Team members (including base64-encoded photos)
- Spin history

**Note**: Data is per-browser and will be lost if:
- Browser cache is cleared
- Using a different browser
- Using incognito/private mode

For production use, consider adding a backend with database storage.

## Future Enhancements

- Real authentication with backend
- Database storage (instead of LocalStorage)
- Export/import team data
- Email notifications when selected
- Statistics and analytics
- Mobile app version

## License

MIT
