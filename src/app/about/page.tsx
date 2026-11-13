import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '@/components/public/PublicShell';

export const metadata: Metadata = {
  title: 'Jax: personal AI assistant',
  description: 'Jax is a private personal assistant app that manages schedule, to-dos, finances, health and investments with AI.',
};

export default function AboutPage() {
  return (
    <PublicShell title="Jax: your personal AI assistant">
      <p>
        Jax is a private web app that helps one person run their day: a calendar and to-do list, personal finance and bank statements,
        health data from a fitness tracker, and an investment portfolio. An AI assistant, also called Jax, answers questions and carries out
        simple commands in the app and over WhatsApp.
      </p>

      <h2>What Jax does</h2>
      <ul>
        <li><b>Schedule:</b> creates and shows events, and keeps them in sync with the user&apos;s own Google Calendar.</li>
        <li><b>Finance:</b> records income and spending, reads bank statements the user uploads, and shows a personal accounting dashboard.</li>
        <li><b>Health:</b> shows sleep, steps and heart rate from the user&apos;s Fitbit or Google Health account, and workout and meal logs.</li>
        <li><b>Investments:</b> tracks a stock portfolio and gives educational analysis. It is not financial advice.</li>
        <li><b>AI assistant:</b> understands text, voice and photos, and speaks back.</li>
      </ul>

      <h2>How Jax uses your Google data</h2>
      <p>
        When you choose to connect Google Calendar, Jax asks for permission to view and edit your calendar events (the
        <code> calendar.events </code> scope). It uses this only to show your events and to add events that you ask for, for example
        &ldquo;set a meeting on Monday at 10&rdquo;. Jax does not use Google data for advertising and does not sell it. Read the
        full details in the <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Who it is for</h2>
      <p>
        Jax is built for personal use by its owner, Nico Japar. Access requires an account, and only the owner&apos;s own data is ever shown.
      </p>

      <p>
        <Link href="/login">Sign in</Link> · <Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms of Service</Link> ·
        Contact: <a href="mailto:nicojapar@gmail.com">nicojapar@gmail.com</a>
      </p>
    </PublicShell>
  );
}
