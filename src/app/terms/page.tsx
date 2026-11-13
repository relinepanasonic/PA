import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '@/components/public/PublicShell';

export const metadata: Metadata = {
  title: 'Terms of Service | Jax',
  description: 'The terms for using the Jax personal assistant app.',
};

export default function TermsPage() {
  return (
    <PublicShell title="Terms of Service" updated="13 November 2026">
      <p>
        These terms apply to your use of the Jax personal assistant app at pa.profesoronline.id (&ldquo;Jax&rdquo;), operated by Nico Japar (&ldquo;we&rdquo;).
        By signing in or using Jax you agree to them. If you do not agree, please do not use the app.
      </p>

      <h2>1. What Jax is</h2>
      <p>
        Jax is a personal productivity tool: schedule, to-dos, finance tracking, health data, an investment tracker and an AI assistant.
        It is provided for personal use and may change or stop at any time.
      </p>

      <h2>2. Your account</h2>
      <p>You are responsible for your login, for the phone numbers you allow to command Jax, and for the data you enter. Keep your credentials private.</p>

      <h2>3. AI answers and accuracy</h2>
      <ul>
        <li>The assistant is powered by AI and can make mistakes. Check important results, such as amounts, dates, calendar events and recorded trades.</li>
        <li>Reading of receipts, bank statements and pictures is automatic and may be wrong.</li>
      </ul>

      <h2>4. Not financial, medical or legal advice</h2>
      <p>
        Stock analysis, finance insights, health summaries and recommendations in Jax are for information and learning only. They are not financial, investment, medical or legal advice.
        Investing involves risk, including loss of capital. You make your own decisions and bear their consequences.
      </p>

      <h2>5. Third-party services</h2>
      <p>
        Jax connects to services such as Google (Calendar, Google Health), Fitbit, Fonnte (WhatsApp), Supabase, Vercel and Anthropic. Their own terms apply to your use of them.
        We are not responsible for outages or changes at those services.
      </p>

      <h2>6. Acceptable use</h2>
      <p>Do not misuse Jax: no attempts to break its security, no unlawful use, and no use that harms other people or services.</p>

      <h2>7. Your data</h2>
      <p>You keep ownership of your data. How we handle it is described in the <Link href="/privacy">Privacy Policy</Link>.</p>

      <h2>8. No warranty and limit of liability</h2>
      <p>
        Jax is provided &ldquo;as is&rdquo; without warranties of any kind. To the extent allowed by law, we are not liable for any loss or damage arising from use of Jax,
        including financial loss from decisions made using its information.
      </p>

      <h2>9. Changes and termination</h2>
      <p>We may update these terms or end access to Jax at any time. Continued use after a change means you accept the new terms.</p>

      <h2>10. Contact</h2>
      <p>Questions: <a href="mailto:nicojapar@gmail.com">nicojapar@gmail.com</a>.</p>
    </PublicShell>
  );
}
