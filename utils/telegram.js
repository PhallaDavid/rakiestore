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

  // Khmer message
  let message = `ការបញ្ជាទិញថ្មី បានទទួល\n`;
  message += `លេខបញ្ជាទិញ: \`${orderId}\`\n\n`;

  // Customer Info
  message += `ព័ត៌មានអតិថិជន:\n`;
  message += `ឈ្មោះ: ${customerName || 'N/A'}\n`;
  message += `លេខទូរស័ព្ទ: ${phone}\n`;
  message += `អាសយដ្ឋាន: ${address}\n`;
  if (note) message += `កំណត់សំគាល់: ${note}\n`;

  message += `\nមុខទំនិញ:\n`;

  // Items
  items.forEach((item, index) => {
    const subtotal = item.price * item.quantity;
    message += `${index + 1}. ${item.name}\n`;
    message += `   ចំនួន: ${item.quantity}\n`;
    message += `   តម្លៃ: $${item.price}\n`;
    message += `   សរុប: $${subtotal.toFixed(2)}\n\n`;
  });

  // Total
  message += `តម្លៃសរុប: $${totalPrice.toFixed(2)}\n`;
  message += `============================`;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
    const mainImage = items[0]?.thumbnail || '';

    if (mainImage) {
      await axios.post(url, {
        chat_id: TELEGRAM_CHAT_ID,
        photo: mainImage,
        caption: message,
        parse_mode: 'Markdown'
      });
    } else {
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      });
    }

    console.log('Order alert sent to Telegram');
  } catch (error) {
    console.error('Telegram Alert Error:', error.response?.data || error.message);
  }
};
