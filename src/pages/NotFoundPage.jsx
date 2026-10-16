import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="container-page not-found-page flex min-h-[70vh] flex-col items-center justify-center py-12 text-center">
      <span className="section-kicker">THE FTP NEWS</span>
      <h1 className="mt-3 font-serif text-7xl font-extrabold text-gray-950">404</h1>
      <p className="mt-3 text-gray-600">The page you requested could not be found.</p>
      <Link to="/" className="btn-primary mt-6">
        Back to Home
      </Link>
    </section>
  );
}
