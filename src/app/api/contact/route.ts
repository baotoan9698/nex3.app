import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let data: { name?: unknown; email?: unknown; message?: unknown };
  try { data = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const { name, email, message } = data;
  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length > 200 || email.length > 320 || message.length > 10000) {
    return NextResponse.json({ error: 'Please enter a valid email and a message under 10,000 characters.' }, { status: 400 });
  }
  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ mode: 'email', email: process.env.CONTACT_EMAIL || 'min.nguyen@nex3.app' });
  try {
    const response = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, message }), signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Delivery failed');
    return NextResponse.json({ mode: 'sent' });
  } catch {
    return NextResponse.json({ error: 'Unable to deliver your message. Please try again or contact us by email.' }, { status: 502 });
  }
}
