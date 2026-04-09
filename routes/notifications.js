import express from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { messaging } from '../config/firebase.js';

const router = express.Router();

// Save or update FCM token for the authenticated user
router.post('/token', verifyToken, async (req, res) => {
  const { fcm_token, device_type } = req.body;
  const user_id = req.user.id;

  if (!fcm_token) {
    return res.status(400).json({ message: 'FCM token is required' });
  }

  try {
    // Upsert token
    const query = `
      INSERT INTO user_fcm_tokens (user_id, fcm_token, device_type)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE device_type = VALUES(device_type), created_at = CURRENT_TIMESTAMP
    `;
    await pool.query(query, [user_id, fcm_token, device_type || 'web']);

    res.status(200).json({ message: 'Token saved successfully' });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove FCM token (on logout)
router.post('/token/remove', verifyToken, async (req, res) => {
  const { fcm_token } = req.body;
  const user_id = req.user.id;

  try {
    await pool.query('DELETE FROM user_fcm_tokens WHERE user_id = ? AND fcm_token = ?', [user_id, fcm_token]);
    res.status(200).json({ message: 'Token removed successfully' });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Test notification route
router.post('/test-send', verifyToken, async (req, res) => {
  try {
    await sendNotificationToUser(
      req.user.id,
      'Test Notification 🚀',
      'This is a test notification from RakieStore! If you see this, FCM is working.'
    );
    res.status(200).json({ message: 'Test notification sent' });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ message: 'Error sending notification' });
  }
});

// Helper function to send notification to a user
export const sendNotificationToUser = async (user_id, title, body, data = {}) => {
  if (!messaging) {
    console.error('❌ Notification Error: Firebase Messaging not initialized. Check config/serviceAccountKey.json');
    return;
  }

  try {
    const [tokens] = await pool.query('SELECT fcm_token FROM user_fcm_tokens WHERE user_id = ?', [user_id]);
    
    if (tokens.length === 0) {
      console.warn(`⚠️ Notification Warning: No FCM tokens found for user_id: ${user_id}`);
      return;
    }

    console.log(`📡 Sending notification to user ${user_id} (${tokens.length} tokens)...`);
    const registrationTokens = tokens.map(t => t.fcm_token);

    const message = {
      notification: { title, body },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // Legacy but sometimes useful
      },
      tokens: registrationTokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(`${response.successCount} messages were sent successfully`);
    
    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(registrationTokens[idx]);
        }
      });
      
      if (failedTokens.length > 0) {
        await pool.query('DELETE FROM user_fcm_tokens WHERE fcm_token IN (?)', [failedTokens]);
      }
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

export default router;
