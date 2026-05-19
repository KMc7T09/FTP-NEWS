export default function SupabaseSetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-8 shadow">
        <p className="text-sm font-extrabold uppercase tracking-wide text-brand-red">Supabase Setup Required</p>
        <h1 className="mt-4 text-3xl font-extrabold">FTP NEWS is ready to connect.</h1>
        <p className="mt-4 leading-7 text-gray-600">
          Add your Supabase project URL and anon key to `.env`, then restart the development server.
          GitHub + Netlify will host the frontend, and Supabase will store users, articles, comments, likes, and roles.
        </p>
        <div className="mt-6 rounded-md bg-gray-950 p-4 font-mono text-sm text-white">
          <p>VITE_SUPABASE_URL=your-project-url</p>
          <p>VITE_SUPABASE_ANON_KEY=your-anon-key</p>
        </div>
      </div>
    </div>
  );
}
