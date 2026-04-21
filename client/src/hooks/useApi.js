import { useState, useEffect, useCallback, useRef } from 'react';
import API from '../utils/api';

/**
 * Generic data fetching hook with loading/error state
 * @param {string} url - API endpoint
 * @param {object} options - { initialData, deps, skip }
 */
export const useFetch = (url, options = {}) => {
  const { initialData = null, deps = [], skip = false } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetch = useCallback(async () => {
    if (skip) return;
    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      const res = await API.get(url, { signal: abortRef.current.signal });
      setData(res.data);
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError(err.response?.data?.message || err.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }, [url, skip, ...deps]); // eslint-disable-line

  useEffect(() => {
    fetch();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
};

/**
 * Hook for paginated list data
 * @param {string} baseUrl - Base API endpoint (filters/page appended)
 * @param {object} filters - Query parameters
 */
export const usePaginatedFetch = (baseUrl, filters = {}) => {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v != null))
      );
      const res = await API.get(`${baseUrl}?${params}`);
      setData(res.data.complaints || res.data.users || res.data.data || []);
      setPagination(res.data.pagination || { total: res.data.total || 0, page: 1, pages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, JSON.stringify(filters)]); // eslint-disable-line

  useEffect(() => { fetch(); }, [fetch]);

  return { data, pagination, loading, error, refetch: fetch };
};

/**
 * Hook for admin dashboard stats
 */
export const useAdminStats = () => {
  return useFetch('/admin/stats', { initialData: { stats: {} } });
};

/**
 * Hook for debounced search
 * @param {string} value
 * @param {number} delay - ms
 */
export const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

/**
 * Hook to track online/offline status
 */
export const useOnlineStatus = () => {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
};

/**
 * Hook to persist state in localStorage
 * @param {string} key
 * @param {*} initialValue
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (err) {
      console.error(err);
    }
  };

  return [storedValue, setValue];
};
