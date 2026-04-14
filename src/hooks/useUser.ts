'use client';

import { useState, useCallback, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  plan: 'free' | 'pro';
  planExpiresAt: string | null;
  balance: number;
  createdAt: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/user');
      if (res.ok) setUser(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  return { user, loading, refetch: fetchUser };
}
