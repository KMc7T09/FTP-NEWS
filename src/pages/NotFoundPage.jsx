import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="container-page flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="text-5xl font-extrabold">404</h1>
      <p className="mt-3 text-gray-600">The page you requested could not be found.</p>
      <Link to="/" className="btn-primary mt-6">
        Back to Home
      </Link>
    </section>
  );
}
