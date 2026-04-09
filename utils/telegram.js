import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_BOT_TOKEN = "8390687727:AAHX7_vJwqmoL-343vMgFqN4BXDn7Y13ee4";
const TELEGRAM_CHAT_ID = "-4881761406";

/**
 * Send an order alert to Telegram
 * @param {Object} orderDetails 
 */
export const sendOrderToTelegram = async (orderDetails) => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️ Telegram Warning: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing in .env');
    return;
  }

  const { orderId, customerName, phone, address, items, totalPrice, note } = orderDetails;

  // Format message
  let message = `🛍️ *NEW ORDER RECEIVED!* (#${orderId})\n\n`;
  message += `👤 *Customer:* ${customerName || 'N/A'}\n`;
  message += `📞 *Phone:* ${phone}\n`;
  message += `📍 *Address:* ${address}\n`;
  if (note) message += `📝 *Note:* ${note}\n`;
  message += `\n📦 *Items:* \n`;

  items.forEach((item, index) => {
    message += `${index + 1}. ${item.name} x${item.quantity} - $${item.price}\n`;
  });

  message += `\n💰 *Total Price:* $${totalPrice.toFixed(2)}`;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
    
    // Get first item image if available
    const mainImage = items[0]?.thumbnail || '';

    if (mainImage) {
      await axios.post(url, {
        chat_id: TELEGRAM_CHAT_ID,
        photo: mainImage,
        caption: message,
        parse_mode: 'Markdown'
      });
    } else {
      // Send text only if no image
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      });
    }
    
    console.log('✅ Order alert sent to Telegram');
  } catch (error) {
    console.error('❌ Telegram Alert Error:', error.response?.data || error.message);
  }
};
