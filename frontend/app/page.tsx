'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // If already logged in, go straight to dashboard
  useEffect(() => {
    if (!loading && user) router.push('/dashboard');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">

        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-blue-700 mb-2">🚂 Voyago</h1>
          <p className="text-gray-600 text-lg">Live Journey Companion for Trains & Flights</p>
        </div>

        {/* Feature highlights */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 text-left space-y-4">
          {[
            ['🔴', 'Live journey rooms', 'Chat with co-passengers matched by PNR'],
            ['🪑', 'Zero double-bookings', 'Redis seat locking prevents conflicts'],
            ['🚖', 'Split cab fares', 'Settle payments live inside the room'],
            ['📧', 'Instant ticket email', 'PDF ticket in your inbox within 3 seconds'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="flex items-start gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="font-semibold text-gray-800">{title}</p>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="space-y-3">
          <Link
            href="/register"
            className="block w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="block w-full bg-white text-blue-600 py-3 rounded-xl font-semibold text-lg border border-blue-200 hover:bg-blue-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
