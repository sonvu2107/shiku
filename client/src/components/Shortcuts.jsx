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
import { api } from '../api';

/**
 * Shortcuts - Component hiển thị lối tắt như Facebook
 * Bao gồm nhóm, sự kiện, trang đã lưu và các shortcut khác
 */
export default function Shortcuts({ user }) {
  const [shortcuts, setShortcuts] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (user) {
      loadShortcuts();
    }
  }, [user]);

  const loadShortcuts = async () => {
    try {
      setLoading(true);
      
      // Load groups của user
      const groupsResponse = await api('/api/groups/my-groups');
      if (groupsResponse.success) {
        setMyGroups(groupsResponse.data.groups.slice(0, 3));
      }

      // Load events của user
      const eventsResponse = await api('/api/events?filter=my&limit=3');
      if (eventsResponse.events) {
        setMyEvents(eventsResponse.events.slice(0, 3));
      }

      // Tạo danh sách shortcuts
      const shortcutsList = [
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
        }
      ];

      setShortcuts(shortcutsList);
    } catch (error) {
      console.error('Error loading shortcuts:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
        {shortcut.icon}
      </div>
    );
  };

  const visibleShortcuts = showAll ? shortcuts : shortcuts.slice(0, 6);

  if (loading) {
    return (
      <div className="bg-white rounded-r-lg shadow-sm border border-gray-200 border-l-0">
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
    <div className="bg-white rounded-r-lg shadow-sm border border-gray-200 border-l-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Lối tắt của bạn</h3>
          {shortcuts.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ChevronDown size={16} className={showAll ? 'rotate-180' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Shortcuts List */}
      <div className="py-2">
        {visibleShortcuts.map((shortcut) => (
          <Link
            key={shortcut.id}
            to={shortcut.url}
            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors group"
          >
            {getAvatar(shortcut)}
            <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
              {shortcut.title}
            </span>
            {shortcut.type === 'group' && (
              <div className="ml-auto">
                <Users size={12} className="text-gray-400" />
              </div>
            )}
            {shortcut.type === 'groups' && (
              <div className="ml-auto">
                <Users size={12} className="text-gray-400" />
              </div>
            )}
            {shortcut.type === 'event' && (
              <div className="ml-auto">
                <Calendar size={12} className="text-gray-400" />
              </div>
            )}
          </Link>
        ))}

        {/* Quick actions */}
        <div className="pt-2 border-t border-gray-100">
          <Link
            to="/groups/create"
            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Plus size={16} className="text-blue-600" />
            </div>
            <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
              Tạo nhóm
            </span>
          </Link>
          
          <Link
            to="/events/create"
            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Plus size={16} className="text-green-600" />
            </div>
            <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
              Tạo sự kiện
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
