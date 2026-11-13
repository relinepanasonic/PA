import type { Metadata } from 'next';
import PublicShell from '@/components/public/PublicShell';

export const metadata: Metadata = {
  title: 'Privacy Policy | Jax',
  description: 'How Jax collects, uses, stores and protects your data, including Google user data.',
};

export default function PrivacyPage() {
  return (
    <PublicShell title="Privacy Policy" updated="13 November 2026">
      <p>
        This policy explains what data the Jax personal assistant app (&ldquo;Jax&rdquo;, &ldquo;the app&rdquo;, at pa.profesoronline.id) handles,
        why, and what control you have. Jax is operated by Nico Japar (&ldquo;we&rdquo;). Contact: <a href="mailto:nicojapar@gmail.com">nicojapar@gmail.com</a>.
      </p>

      <h2>1. Data we handle</h2>
      <ul>
        <li><b>Account data:</b> your email address and sign-in details, used to log you in.</li>
        <li><b>Google Calendar data</b> (only if you connect it): the titles, times and descriptions of your calendar events, and the access tokens Google gives the app.</li>
        <li><b>Health data</b> (only if you connect Fitbit or Google Health): steps, heart rate and sleep summaries, and the access tokens for that connection.</li>
        <li><b>Finance data you provide:</b> transactions, categories, bank statements and pictures you upload, savings balances, debts and your stock portfolio.</li>
        <li><b>Content you send to the assistant:</b> messages typed in the app, voice recognised by your browser, photos such as receipts, and WhatsApp messages from approved phone numbers that start with &ldquo;Hi Jax&rdquo;.</li>
      </ul>

      <h2>2. How we use it</h2>
      <p>We use your data only to provide the features you ask for inside the app: showing your schedule, creating the calendar events you request, showing your health and finance dashboards, and answering your questions.</p>
      <ul>
        <li>We do <b>not</b> sell your data and we do not use it for advertising.</li>
        <li>We do not share it with other people. It is processed only by the service providers listed in section 4 so the app can work.</li>
        <li>We do not use Google user data to develop, improve or train generalized AI or machine-learning models.</li>
        <li>Humans do not read your data, except when you ask us for support, when needed for security or to follow the law.</li>
      </ul>

      <h2>3. Google user data (Limited Use)</h2>
      <p>
        Jax&apos;s use and transfer of information received from Google APIs adheres to the
        {' '}<a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>,
        including the Limited Use requirements. Specifically:
      </p>
      <ul>
        <li>The <code>calendar.events</code> permission is used only to read your events and to create, change or delete events that you ask Jax to handle.</li>
        <li>Calendar data is used only to provide these user-facing features. It is not used for advertising or sold.</li>
        <li>When you ask the AI assistant about your schedule, the relevant event details are sent to our AI provider (section 4) only to produce the answer, not for any other purpose.</li>
      </ul>

      <h2>4. Service providers that process data for us</h2>
      <ul>
        <li><b>Supabase</b> stores the app database (account and app data) and sign-in.</li>
        <li><b>Vercel</b> hosts the app and runs its server functions.</li>
        <li><b>Anthropic</b> provides the AI model that understands your requests and reads uploaded pictures and statements. Text and files you send to the assistant are sent to it to produce a reply.</li>
        <li><b>Google</b> (Calendar and Google Health APIs) and <b>Fonnte</b> (WhatsApp gateway) are used when you connect those features.</li>
      </ul>

      <h2>5. Storage, security and retention</h2>
      <p>
        Data is stored in a private database protected by per-user access rules, and transmitted over HTTPS. Access tokens are stored on the server side and never shown in the browser.
        We keep your data while your account is active. WhatsApp messages and app data are kept so the features keep working until you delete them.
      </p>

      <h2>6. Your choices</h2>
      <ul>
        <li><b>Disconnect Google:</b> remove Jax at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">myaccount.google.com/permissions</a> at any time. Jax then loses all access to your calendar.</li>
        <li><b>Delete data:</b> email <a href="mailto:nicojapar@gmail.com">nicojapar@gmail.com</a> and we will delete your account and stored data, including Google tokens, within 30 days.</li>
        <li><b>Access or correct data:</b> you can view and edit your data inside the app, or ask us to provide it.</li>
      </ul>

      <h2>7. Children</h2>
      <p>Jax is not intended for people under 17 and we do not knowingly collect their data.</p>

      <h2>8. Changes</h2>
      <p>If we change this policy we will update the date above and, for material changes, tell you in the app.</p>

      <h2>9. Contact</h2>
      <p>Questions or requests: <a href="mailto:nicojapar@gmail.com">nicojapar@gmail.com</a>.</p>

      <h2>Ringkasan singkat (Bahasa Indonesia)</h2>
      <p>
        Jax hanya memakai datamu untuk menjalankan fitur yang kamu minta: jadwal, keuangan, kesehatan, investasi dan asisten AI. Data tidak dijual dan tidak dipakai untuk iklan.
        Akses Google Calendar hanya untuk melihat dan membuat acara yang kamu minta, dan bisa kamu cabut kapan saja di myaccount.google.com/permissions.
        Untuk menghapus data, kirim email ke nicojapar@gmail.com.
      </p>
    </PublicShell>
  );
}
