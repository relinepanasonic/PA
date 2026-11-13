import Link from 'next/link';
import Image from 'next/image';

// Simple public page frame (no login) for the about, privacy and terms pages that Google and visitors can read.
export default function PublicShell({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#040814] text-slate-200">
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/about" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Jax" width={36} height={36} className="rounded-xl" />
            <span className="font-bold text-white">Jax</span>
          </Link>
          <nav className="flex items-center gap-4 text-xs text-slate-400">
            <Link href="/about" className="hover:text-white">About</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/login" className="px-3 py-1.5 rounded-lg bg-blue-600/30 border border-blue-400/40 text-blue-100 hover:bg-blue-600/50">Sign in</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">{title}</h1>
        {updated && <p className="text-xs text-slate-500 mt-1">Last updated: {updated}</p>}
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-300 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-cyan-300 [&_a]:underline">
          {children}
        </div>
      </main>
      <footer className="border-t border-white/10 mt-10">
        <div className="max-w-3xl mx-auto px-5 py-5 text-xs text-slate-500 flex flex-wrap gap-x-5 gap-y-1">
          <span>Jax, a personal assistant app by Nico Japar</span>
          <Link href="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-300">Terms of Service</Link>
          <a href="mailto:nicojapar@gmail.com" className="hover:text-slate-300">nicojapar@gmail.com</a>
        </div>
      </footer>
    </div>
  );
}
