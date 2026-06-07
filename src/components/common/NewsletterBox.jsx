import { Mail } from 'lucide-react';

export default function NewsletterBox() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <Mail size={20} className="text-brand-red" />
        <h2 className="text-lg font-extrabold">Newsletter</h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-gray-600">Get FTP's political brief, public issue explainers, and youth-focused updates.</p>
      <form className="mt-4 grid gap-2" onSubmit={(event) => event.preventDefault()}>
        <input className="input" type="email" placeholder="Email address" />
        <button className="btn-primary">Join Updates</button>
      </form>
    </div>
  );
}
