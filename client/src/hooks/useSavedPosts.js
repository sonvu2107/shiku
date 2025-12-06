/**
 * Batch Saved Posts Hook
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api';

/**
 * Check saved status for multiple posts in a single request
 * @param {Array} posts - Array of post objects with _id
 * @returns {{ savedMap: Record<string, boolean>, loading: boolean, error: Error | null, refetch: Function }}
 */
export function useSavedPosts(posts) {
  const [savedMap, setSavedMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // OPTIMIZED: Wrap in useMemo to avoid recalculating on every render
  const postIdsKey = useMemo(() => {
    if (!Array.isArray(posts)) return '';
    return posts
      .map((p) => p?._id)
      .filter(Boolean)
      .sort()
      .join(',');
  }, [posts]);


  const fetchSavedStatus = useCallback(async () => {
    const ids = Array.from(
      new Set(
        (posts || [])
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
    } finally {
      setLoading(false);
    }
  }, [postIdsKey, posts]);

  useEffect(() => {
    fetchSavedStatus();
  }, [fetchSavedStatus, postIdsKey]);

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

