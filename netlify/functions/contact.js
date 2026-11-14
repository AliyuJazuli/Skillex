const response = (statusCode, body) => ({
  statusCode,
  headers: {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  },
  body: JSON.stringify(body)
});

function isEmail(value) {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getGmailAccessToken() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Contact email delivery is missing Google OAuth configuration.");
  }
  const result = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  if (!result.ok) {
    console.error("Google OAuth token request failed:", result.status);
    throw new Error("Contact email could not be authorized.");
  }
  const token = await result.json();
  if (!token.access_token) throw new Error("Google did not return an access token.");
  return token.access_token;
}

function makeMessage({ name, email, message, senderEmail, recipientEmail }) {
  const text = [
    "A new message was sent from the Skillex contact form.",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    "",
    message
  ].join("\r\n");
  return [
    `From: Skillex Contact <${senderEmail}>`,
    `To: ${recipientEmail}`,
    `Reply-To: ${email}`,
    "Subject: Contact message from Skillex",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(text, "utf8").toString("base64")
  ].join("\r\n");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return response(405, { error: "Use POST to send a contact message." });
  let body;
  try {
    body = JSON.parse(event.body || "");
  } catch {
    return response(400, { error: "Enter valid contact details and try again." });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const senderEmail = process.env.GMAIL_SENDER_EMAIL?.trim();
  const recipientEmail = process.env.CONTACT_RECIPIENT_EMAIL?.trim();
  if (!name || name.length > 80 || !isEmail(email) || !message || message.length > 2000
    || body.company || body.botField) {
    return response(400, { error: "Complete the required fields with valid details before sending." });
  }
  if (!isEmail(senderEmail) || !isEmail(recipientEmail)) {
    console.error("Contact email delivery is missing a valid sender or recipient address.");
    return response(503, { error: "Contact messages are temporarily unavailable. Please try again later." });
  }

  try {
    const accessToken = await getGmailAccessToken();
    const raw = encodeBase64Url(makeMessage({ name, email, message, senderEmail, recipientEmail }));
    const result = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw })
    });
    if (!result.ok) {
      console.error("Gmail message send failed:", result.status);
      throw new Error("Gmail could not send this message.");
    }
    return response(200, { sent: true });
  } catch (error) {
    console.error("Skillex contact message delivery failed:", error);
    return response(503, { error: "We couldn't send your message right now. Please try again later." });
  }
};
