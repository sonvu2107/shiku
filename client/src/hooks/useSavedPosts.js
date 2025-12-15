/**
 * Batch Saved Posts Hook
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '../api';

/**
 * Check saved status for multiple posts in a single request
 * @param {Array} posts - Array of post objects with _id
 * @param {Object} options - Options
 * @param {boolean} options.enabled - Whether to fetch saved status (default: true)
 * @returns {{ savedMap: Record<string, boolean>, loading: boolean, error: Error | null, refetch: Function }}
 */
export function useSavedPosts(posts, { enabled = true } = {}) {
  const [savedMap, setSavedMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use ref to store posts to avoid triggering effect on every render
  const postsRef = useRef(posts);
  postsRef.current = posts;

  // OPTIMIZED: Wrap in useMemo to avoid recalculating on every render
  const postIdsKey = useMemo(() => {
    if (!enabled || !Array.isArray(posts)) return '';
    return posts
      .map((p) => p?._id)
      .filter(Boolean)
      .sort()
      .join(',');
  }, [posts, enabled]);

  // Track last fetched key to prevent duplicate fetches
  const lastFetchedKeyRef = useRef('');

  const fetchSavedStatus = useCallback(async () => {
    // Skip if disabled or already fetched for this key
    if (!enabled) {
      if (Object.keys(savedMap).length > 0) setSavedMap({});
      return;
    }

    if (lastFetchedKeyRef.current === postIdsKey && postIdsKey !== '') {
      return;
    }

    const currentPosts = postsRef.current;
    const ids = Array.from(
      new Set(
        (currentPosts || [])
          .map((post) => post?._id)
          .filter(Boolean)
      )
    );

    if (ids.length === 0) {
      setSavedMap({});
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    lastFetchedKeyRef.current = postIdsKey;

    try {
      const query = encodeURIComponent(ids.join(','));
      const response = await api(`/api/posts/is-saved?ids=${query}`);
      const result = {};
      ids.forEach((id) => {
        result[id] = Boolean(response?.[id]);
      });
      setSavedMap(result);
    } catch (err) {
      console.error('[useSavedPosts] Error:', err);
      setError(err);
      setSavedMap({});
      lastFetchedKeyRef.current = ''; // Allow retry on error
    } finally {
      setLoading(false);
    }
  }, [postIdsKey]);

  useEffect(() => {
    if (postIdsKey) {
      fetchSavedStatus();
    }
  }, [postIdsKey]); // Only depend on postIdsKey, not fetchSavedStatus

  const updateSavedState = useCallback((postId, value) => {
    setSavedMap((prev) => {
      if (prev[postId] === value) {
        return prev;
      }
      return { ...prev, [postId]: value };
    });
  }, []);

  return {
    savedMap,
    loading,
    error,
    refetch: fetchSavedStatus,
    updateSavedState,
  };
}

/**
 * Toggle save status for a single post
 * Updates local cache immediately for optimistic UI
 */
export function useToggleSavePost() {
  const [saving, setSaving] = useState(false);

  const toggleSave = async (postId, onSuccess) => {
    setSaving(true);

    try {
      const response = await api(`/api/posts/${postId}/save`, { method: 'POST' });
      const newState = Boolean(response?.saved);

      if (onSuccess) {
        onSuccess(newState);
      }
    } catch (err) {
      console.error('[useToggleSavePost] Error:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { toggleSave, saving };
}

