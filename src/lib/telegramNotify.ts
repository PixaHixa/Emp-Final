const TELEGRAM_BOT_TOKEN = '8974388155:AAFgtdlaXq2oOFihLNW9DWlZyrROS2NI1dk'
const TELEGRAM_CHAT_ID = '1445379795'

export async function sendTelegramNotification(message: string): Promise<void> {
  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    )
  } catch (e) {
    console.error('Telegram notification failed:', e)
  }
}
