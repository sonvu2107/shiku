import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  Bookmark, 
  Plus, 
  ChevronDown,
  Star,
  Clock,
  Image as ImageIcon
} from 'lucide-react';
import { useMyGroups } from '../hooks/useMyGroups';
import { useMyEvents } from '../hooks/useEvents';

/**
 * Shortcuts - Component hiển thị lối tắt như Facebook
 * Bao gồm nhóm, sự kiện, trang đã lưu và các shortcut khác
 */
export default function Shortcuts({ user, minimal = false }) {
  const [showAll, setShowAll] = useState(false);

  // Sử dụng React Query cho groups và events
  const { data: groupsData, isLoading: groupsLoading } = useMyGroups();
  const { data: eventsData, isLoading: eventsLoading } = useMyEvents({ filter: 'my', limit: 3 });
  
  const myGroups = groupsData?.data?.groups?.slice(0, 3) || [];
  const myEvents = eventsData?.events?.slice(0, 3) || [];

  // Tạo shortcuts list trực tiếp, không cần useState + useEffect
  const shortcuts = [
    // Groups
    ...myGroups.map(group => ({
      id: group._id,
      type: 'group',
      title: group.name,
      icon: <Users size={16} />,
      url: `/groups/${group._id}`,
      avatar: group.avatar
    })),
    
    // Events
    ...myEvents.map(event => ({
      id: event._id,
      type: 'event',
      title: event.title,
      icon: <Calendar size={16} />,
      url: `/events/${event._id}`,
      avatar: event.coverImage
    })),
    
    // Static shortcuts
    {
      id: 'groups',
      type: 'groups',
      title: 'Nhóm',
      icon: <Users size={16} />,
      url: '/groups',
      avatar: null
    },
    {
      id: 'media',
      type: 'media',
      title: 'Kho media',
      icon: <ImageIcon size={16} />,
      url: '/media',
      avatar: null
    },
    {
      id: 'saved',
      type: 'saved',
      title: 'Bài đã lưu',
      icon: <Bookmark size={16} />,
      url: '/saved',
      avatar: null
    }
  ];

  const getAvatar = (shortcut) => {
    if (shortcut.avatar) {
      return (
        <img
          src={shortcut.avatar}
          alt={shortcut.title}
          className="w-8 h-8 rounded-full object-cover"
        />
      );
    }
    
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center">
        {shortcut.icon}
      </div>
    );
  };

  const visibleShortcuts = showAll ? shortcuts : shortcuts.slice(0, 6);

  if (groupsLoading || eventsLoading) {
    return (
      <div className={minimal ? "" : "bg-white rounded-r-lg shadow-sm border border-gray-200 border-l-0"}>
        {/* Header skeleton */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="h-5 bg-gray-200 rounded animate-pulse w-32"></div>
        </div>
        
        {/* Items skeleton */}
        <div className="py-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={minimal ? "" : "bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700"}>
      {/* Header */}
      <div className={minimal ? "px-1 py-1" : "px-4 py-3 border-b border-gray-100 dark:border-gray-700"}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Lối tắt của bạn</h3>
          {shortcuts.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <ChevronDown size={16} className={showAll ? 'rotate-180' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Shortcuts List */}
      <div className={minimal ? "py-1" : "py-2"}>
        {visibleShortcuts.map((shortcut) => (
          <Link
            key={shortcut.id}
            to={shortcut.url}
            className={minimal ? "flex items-center gap-3 px-2 py-2 hover:bg-gray-50/40 dark:hover:bg-gray-700/40 transition-colors group rounded-lg" : "flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"}
          >
            {getAvatar(shortcut)}
            <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors font-medium">
              {shortcut.title}
            </span>
            {shortcut.type === 'group' && (
              <div className="ml-auto">
                <Users size={12} className="text-gray-400 dark:text-gray-500" />
              </div>
            )}
            {shortcut.type === 'groups' && (
              <div className="ml-auto">
                <Users size={12} className="text-gray-400 dark:text-gray-500" />
              </div>
            )}
            {shortcut.type === 'event' && (
              <div className="ml-auto">
                <Calendar size={12} className="text-gray-400 dark:text-gray-500" />
              </div>
            )}
          </Link>
        ))}

        {/* Quick actions */}
        <div className={minimal ? "pt-2" : "pt-2 border-t border-gray-100 dark:border-gray-700"}>
          <Link
            to="/groups/create"
            className={minimal ? "flex items-center gap-3 px-2 py-2 hover:bg-gray-50/40 dark:hover:bg-gray-700/40 transition-colors group rounded-lg" : "flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"}
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-300">
              <Plus size={16} className="" />
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors font-medium">
              Tạo nhóm
            </span>
          </Link>
          
          <Link
            to="/events/create"
            className={minimal ? "flex items-center gap-3 px-2 py-2 hover:bg-gray-50/40 dark:hover:bg-gray-700/40 transition-colors group rounded-lg" : "flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"}
          >
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-300">
              <Plus size={16} className="" />
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors font-medium">
              Tạo sự kiện
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
