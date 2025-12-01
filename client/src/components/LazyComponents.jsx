/**
 * Lazy Components - Component-level code splitting
 * Contains large components that are lazy loaded to optimize performance
 */

import { lazy, Suspense } from 'react';
import { ComponentLoader } from './PageLoader.jsx';

// HEAVY COMPONENTS - Lazy load large components (>15KB)
export const LazyNavbar = lazy(() => import('./Navbar.jsx'));
export const LazyCommentSection = lazy(() => import('./CommentSection.jsx'));
export const LazyPostCreator = lazy(() => import('./PostCreator.jsx'));
export const LazyProfileCustomization = lazy(() => import('./ProfileCustomization.jsx'));
export const LazyGroupCreator = lazy(() => import('./GroupCreator.jsx'));
export const LazyChatPopup = lazy(() => import('./ChatPopup.jsx'));
export const LazyAPIMonitoring = lazy(() => import('./APIMonitoring.jsx'));
export const LazyNewConversationModal = lazy(() => import('./NewConversationModal.jsx'));
export const LazyCallModal = lazy(() => import('./CallModal.jsx'));
export const LazyStoryViewer = lazy(() => import('./StoryViewer.jsx'));
export const LazyRoleManagement = lazy(() => import('./RoleManagement.jsx'));
export const LazyGroupSettingsModal = lazy(() => import('./GroupSettingsModal.jsx'));

// MEDIUM COMPONENTS - Lazy load medium-sized components (10-15KB)  
export const LazyPostCard = lazy(() => import('./PostCard.jsx'));
export const LazyPoll = lazy(() => import('./Poll.jsx'));
export const LazyNotificationBell = lazy(() => import('./NotificationBell.jsx'));
export const LazyMessageList = lazy(() => import('./MessageList.jsx'));
export const LazyStoryAnalytics = lazy(() => import('./StoryAnalytics.jsx'));
export const LazyMediaViewer = lazy(() => import('./MediaViewer.jsx'));
export const LazyStories = lazy(() => import('./Stories.jsx'));
export const LazyGroupCard = lazy(() => import('./GroupCard.jsx'));
export const LazyChatHeader = lazy(() => import('./ChatHeader.jsx'));
export const LazyMediaUpload = lazy(() => import('./MediaUpload.jsx'));

// WRAPPER COMPONENTS with Suspense fallback
export const SuspendedNavbar = (props) => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyNavbar {...props} />
  </Suspense>
);

export const SuspendedCommentSection = (props) => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyCommentSection {...props} />
  </Suspense>
);

export const SuspendedPostCreator = (props) => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyPostCreator {...props} />
  </Suspense>
);

export const SuspendedProfileCustomization = (props) => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyProfileCustomization {...props} />
  </Suspense>
);

export const SuspendedGroupCreator = (props) => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyGroupCreator {...props} />
  </Suspense>
);

export const SuspendedChatPopup = (props) => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyChatPopup {...props} />
  </Suspense>
);

export const SuspendedAPIMonitoring = (props) => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyAPIMonitoring {...props} />
  </Suspense>
);

export const SuspendedCallModal = (props) => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyCallModal {...props} />
  </Suspense>
);

export const SuspendedStoryViewer = (props) => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyStoryViewer {...props} />
  </Suspense>
);

export const SuspendedPostCard = (props) => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyPostCard {...props} />
  </Suspense>
);

export const SuspendedMediaViewer = (props) => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyMediaViewer {...props} />
  </Suspense>
);

export const SuspendedStories = (props) => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyStories {...props} />
  </Suspense>
);

// Export default object with all lazy components
export default {
  // Heavy Components (>15KB)
  Navbar: SuspendedNavbar,
  CommentSection: SuspendedCommentSection,
  PostCreator: SuspendedPostCreator,
  ProfileCustomization: SuspendedProfileCustomization,
  GroupCreator: SuspendedGroupCreator,
  ChatPopup: SuspendedChatPopup,
  APIMonitoring: SuspendedAPIMonitoring,
  CallModal: SuspendedCallModal,
  StoryViewer: SuspendedStoryViewer,
  
  // Medium Components (10-15KB)
  PostCard: SuspendedPostCard,
  MediaViewer: SuspendedMediaViewer,
  Stories: SuspendedStories
};