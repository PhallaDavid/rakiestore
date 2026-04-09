import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

// Note: To use this, you need to download your service account key from Firebase Console
// Project Settings > Service accounts > Generate new private key
// Save it as config/serviceAccountKey.json

let firebaseApp = null;

try {
  const serviceAccount = JSON.parse(
    readFileSync(join(process.cwd(), 'config', 'serviceAccountKey.json'), 'utf8')
  );

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.warn('⚠️ Firebase Admin could not be initialized. Make sure config/serviceAccountKey.json exists.');
  // console.error(error);
}

export const messaging = firebaseApp ? firebaseApp.messaging() : null;
export default admin;
