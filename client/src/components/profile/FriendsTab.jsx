import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, MessageCircle, UserCheck } from "lucide-react";
import { SpotlightCard } from "../ui/SpotlightCard";
import { generateAvatarUrl } from "../../utils/avatarUtils";
import { PROFILE_MESSAGES } from "../../constants/profile";
import { api } from "../../api";
import Avatar from "../Avatar";
import Pagination from "../admin/Pagination";

/**
 * FriendsTab - Component showing Friends tab in user profile
 */
export default function FriendsTab({
  friends,
  friendsLoading,
  pagination,
  onRemoveFriend,
  onPageChange
}) {
  const navigate = useNavigate();
  const [removingFriendId, setRemovingFriendId] = useState(null);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {friendsLoading ? (
          [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-24 bg-neutral-100 dark:bg-neutral-900 rounded-2xl animate-pulse" />)
        ) : friends.length > 0 ? (
          friends.map(friend => (
            <SpotlightCard key={friend._id} className="p-4">
              <div className="flex items-center gap-4 mb-3">
                <Avatar
                  src={friend.avatarUrl}
                  name={friend.name}
                  size={48}
                  className="bg-neutral-200 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/user/${friend._id}`);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="font-bold cursor-pointer hover:text-blue-500 transition-colors truncate"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/user/${friend._id}`);
                    }}
                  >
                    {friend.name}
                  </div>
                  <div className="text-xs text-neutral-500 uppercase font-bold tracking-wider">
                    {friend.isOnline ? "Online" : "Offline"}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {/* Friend badge (since this is the user's own profile, all are friends) */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (window.confirm(`Bạn có chắc muốn hủy kết bạn với ${friend.name}?`)) {
                      try {
                        setRemovingFriendId(friend._id);
                        await api(`/api/friends/remove/${friend._id}`, { method: "DELETE" });
                        // Call callback to reload friends
                        if (onRemoveFriend) {
                          onRemoveFriend();
                        }
                      } catch (err) {
                        alert(err.message || "Có lỗi xảy ra");
                      } finally {
                        setRemovingFriendId(null);
                      }
                    }
                  }}
                  disabled={removingFriendId === friend._id}
                  className="flex-1 px-4 py-2 rounded-full bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <UserCheck size={16} /> {removingFriendId === friend._id ? "Đang xử lý..." : "Đã kết bạn"}
                </button>

                {/* Message button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/chat?user=${friend._id}`);
                  }}
                  className="px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-medium text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle size={16} />
                </button>
              </div>
            </SpotlightCard>
          ))
        ) : (
          <div className="col-span-full text-center py-10 text-neutral-500">Chưa có bạn bè công khai.</div>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          pagination={pagination}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

