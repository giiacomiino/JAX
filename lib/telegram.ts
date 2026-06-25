const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!
const API = `https://api.telegram.org/bot${BOT_TOKEN}`

export async function sendMessage(text: string): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
  })
}

export function bold(text: string) { return `<b>${text}</b>` }
export function line(text: string) { return `${text}\n` }
