// Script to automatically update all API calls to use Safari-compatible functions
// This script helps identify and update remaining API calls that need CSRF token handling

import { safariPOST, safariPUT, safariDELETE, safariAPI } from './safariAPI.js';

/**
 * Safari API Update Helper
 * This utility helps identify which files still need to be updated for Safari compatibility
 */

// List of files that still need Safari API updates
export const filesToUpdate = [
  'client/src/pages/Groups.jsx',
  'client/src/pages/GroupDetail.jsx', 
  'client/src/pages/UserProfile.jsx',
  'client/src/pages/Settings.jsx',
  'client/src/pages/EventDetail.jsx',
  'client/src/pages/Events.jsx',
  'client/src/pages/PostDetail.jsx',
  'client/src/pages/EditPost.jsx',
  'client/src/pages/NewPost.jsx',
  'client/src/components/StoryViewer.jsx',
  'client/src/pages/Media.jsx',
  'client/src/hooks/useAdminData.js',
  'client/src/hooks/useAPIMonitoring.js'
];

// API patterns that need to be updated
export const apiPatterns = [
  {
    pattern: /api\(([^,]+),\s*\{\s*method:\s*['"]POST['"]/g,
    replacement: 'safariPOST($1, {}, "action")',
    description: 'POST requests'
  },
  {
    pattern: /api\(([^,]+),\s*\{\s*method:\s*['"]PUT['"]/g,
    replacement: 'safariPUT($1, {}, "action")',
    description: 'PUT requests'
  },
  {
    pattern: /api\(([^,]+),\s*\{\s*method:\s*['"]DELETE['"]/g,
    replacement: 'safariDELETE($1, "action")',
    description: 'DELETE requests'
  }
];

/**
 * Get remaining API calls that need Safari updates
 */
export function getRemainingAPICalls() {
  return {
    'Groups.jsx': [
      'api(`/api/groups/${groupId}/join`, { method: \'POST\' })',
      'api(`/api/groups/${groupId}/leave`, { method: \'POST\' })'
    ],
    'GroupDetail.jsx': [
      'api(`/api/groups/${id}/join`, { method: \'POST\' })',
      'api(`/api/groups/${id}/leave`, { method: \'POST\' })',
      'api(`/api/groups/${id}/join-requests/cancel`, { method: \'POST\' })',
      'api(`/api/groups/${id}/join-requests/${req._id}/approve`, { method: \'POST\' })',
      'api(`/api/groups/${id}/join-requests/${req._id}/reject`, { method: \'POST\' })'
    ],
    'UserProfile.jsx': [
      'api(`/api/friends/accept/${userId}`, { method: "POST" })',
      'api(`/api/friends/decline/${userId}`, { method: "POST" })',
      'api(`/api/friends/remove/${userId}`, { method: "DELETE" })',
      'api(`/api/users/block/${userId}`, { method: "POST" })',
      'api(`/api/users/unblock/${userId}`, { method: "POST" })'
    ],
    'EventDetail.jsx': [
      'api(`/api/events/${id}/join`, { method: "POST" })',
      'api(`/api/events/${id}/leave`, { method: "POST" })',
      'api(`/api/events/${id}/interested`, { method: "POST" })',
      'api(`/api/events/${id}/decline`, { method: "POST" })',
      'api(`/api/events/${id}`, { method: "DELETE" })'
    ],
    'PostDetail.jsx': [
      'api(`/api/posts/${data.post._id}`, { method: "DELETE" })',
      'api(`/api/posts/${data.post._id}/save`, { method: "POST" })'
    ],
    'EditPost.jsx': [
      'api(`/api/posts/${id}`, { method: "PUT", body: post })'
    ],
    'NewPost.jsx': [
      'api("/api/posts", { method: "POST", body })'
    ],
    'StoryViewer.jsx': [
      'api(`/api/stories/${currentStory._id}/view`, { method: \'POST\' })',
      'api(`/api/stories/${currentStory._id}`, { method: \'DELETE\' })'
    ],
    'Media.jsx': [
      'api(`/api/media/${mediaId}/view`, { method: "POST" })'
    ]
  };
}

/**
 * Generate import statements for Safari API
 */
export function generateSafariImports() {
  return `import { safariPOST, safariPUT, safariDELETE } from "../utils/safariAPI.js";`;
}

/**
 * Check if a file needs Safari API updates
 */
export function needsSafariUpdate(fileContent) {
  const patterns = [
    /api\([^,]+,\s*\{\s*method:\s*['"]POST['"]/,
    /api\([^,]+,\s*\{\s*method:\s*['"]PUT['"]/,
    /api\([^,]+,\s*\{\s*method:\s*['"]DELETE['"]/
  ];
  
  return patterns.some(pattern => pattern.test(fileContent));
}
