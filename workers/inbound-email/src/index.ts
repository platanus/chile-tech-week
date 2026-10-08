import PostalMime from 'postal-mime';

interface Env {
  APP_URL: string;
  FORWARD_TO: string;
  INBOUND_EMAIL_KEY: string;
}

// Posts the message to the app. The app answers 202 whatever it did with it (a handler may
// consume it, or it is dropped), so there is nothing to act on here beyond logging a failure.
async function postToApp(message: ForwardableEmailMessage, env: Env): Promise<void> {
  const parsed = await PostalMime.parse(message.raw);
  const response = await fetch(env.APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.INBOUND_EMAIL_KEY}` },
    body: JSON.stringify({
      from: message.from,
      to: message.to,
      subject: parsed.subject ?? '',
      text: parsed.text ?? '',
      message_id: parsed.messageId ?? '',
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) console.error(`inbound-email: the app answered ${response.status}`);
}

export default {
  // Every message goes to the app and, unconditionally, to the team's Google Group: whether
  // the app consumed it, dropped it or was down, a person always gets the original.
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    try {
      await postToApp(message, env);
    } catch (error) {
      console.error('inbound-email: the app did not take the message', error);
    }
    await message.forward(env.FORWARD_TO);
  },
} satisfies ExportedHandler<Env>;
