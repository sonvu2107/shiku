import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { UserPlus, UserMinus, UserCheck, Calendar, Heart } from "lucide-react";
import MessageButton from "../components/MessageButton";

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    try {
      setLoading(true);
      const data = await api(`/api/users/${userId}`);

      // Map backend response sang friendshipStatus
      let friendshipStatus = "none";
      if (data.user.isFriend) {
        friendshipStatus = "friends";
      } else if (data.user.hasPendingRequest) {
        friendshipStatus =
          data.user.pendingRequestDirection === "sent"
            ? "request_sent"
            : "request_received";
      }

      setProfile({
        ...data,
        friendshipStatus,
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendFriendRequest() {
    try {
      setActionLoading(true);
      await api("/api/friends/send-request", {
        method: "POST",
        body: { to: userId },
      });
      await loadProfile();
      setError("");
    } catch (error) {
      setError(error.message || "Có lỗi xảy ra khi gửi lời mời kết bạn");
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelFriendRequest() {
    try {
      setActionLoading(true);
      await api(`/api/friends/cancel-request/${userId}`, {
        method: "DELETE",
      });
      await loadProfile();
    } catch (error) {
      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function acceptFriendRequest() {
    try {
      setActionLoading(true);
      await api(`/api/friends/accept-request/${profile.requestId}`, {
        method: "POST",
      });
      await loadProfile();
    } catch (error) {
      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectFriendRequest() {
    try {
      setActionLoading(true);
      await api(`/api/friends/reject-request/${profile.requestId}`, {
        method: "POST",
      });
      await loadProfile();
    } catch (error) {
      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function removeFriend() {
    try {
      setActionLoading(true);
      await api(`/api/friends/remove/${userId}`, {
        method: "DELETE",
      });
      await loadProfile();
    } catch (error) {
      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Block user
  async function blockUser() {
    try {
      setActionLoading(true);
      await api(`/api/users/block/${userId}`, { method: "POST" });
      await loadProfile();
      setError("");
    } catch (error) {
      setError(error.message || "Có lỗi xảy ra khi chặn người dùng");
    } finally {
      setActionLoading(false);
    }
  }

  // Unblock user
  async function unblockUser() {
    try {
      setActionLoading(true);
      await api(`/api/users/unblock/${userId}`, { method: "POST" });
      await loadProfile();
      setError("");
    } catch (error) {
      setError(error.message || "Có lỗi xảy ra khi bỏ chặn người dùng");
    } finally {
      setActionLoading(false);
    }
  }

  function renderFriendButton() {
    if (actionLoading) {
      return (
        <button disabled className="btn flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Đang xử lý...
        </button>
      );
    }

    // Nếu người kia chặn mình
    if (profile.user?.theyBlockedMe) {
      return (
        <div className="text-red-600 mt-2">Người dùng này đã chặn bạn</div>
      );
    }

    // Nếu mình đã chặn họ
    if (profile.user?.iBlockedThem) {
      return (
        <button
          onClick={unblockUser}
          className="btn-outline text-red-600 border-red-600 hover:bg-red-50 mt-2"
        >
          Bỏ chặn
        </button>
      );
    }

    // Các trạng thái bạn bè khác (có thêm nút Chặn)
    switch (profile.friendshipStatus) {
      case "friends":
        return (
          <div className="flex gap-2">
            <MessageButton user={profile.user} className="btn flex items-center gap-2" />
            <button
              onClick={removeFriend}
              className="btn-outline text-red-600 border-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <UserMinus size={18} />
              Hủy kết bạn
            </button>
            <button
              onClick={blockUser}
              className="btn-outline text-red-600 border-red-600 hover:bg-red-50"
            >
              Chặn người này
            </button>
          </div>
        );
      case "request_sent":
        return (
          <div className="flex gap-2">
            <button
              onClick={cancelFriendRequest}
              className="btn-outline flex items-center gap-2"
            >
              <UserCheck size={18} />
              Hủy lời mời
            </button>
            <button
              onClick={blockUser}
              className="btn-outline text-red-600 border-red-600 hover:bg-red-50"
            >
              Chặn người này
            </button>
          </div>
        );
      case "request_received":
        return (
          <div className="flex gap-2">
            <button
              onClick={acceptFriendRequest}
              className="btn flex items-center gap-2"
            >
              <UserCheck size={18} />
              Chấp nhận
            </button>
            <button
              onClick={rejectFriendRequest}
              className="btn-outline text-red-600 border-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <UserMinus size={18} />
              Từ chối
            </button>
            <MessageButton user={profile.user} className="btn" />
            <button
              onClick={blockUser}
              className="btn-outline text-red-600 border-red-600 hover:bg-red-50"
            >
              Chặn người này
            </button>
          </div>
        );
      default:
        return (
          <div className="flex gap-2">
            <button
              onClick={sendFriendRequest}
              className="btn flex items-center gap-2"
            >
              <UserPlus size={18} />
              Kết bạn
            </button>
            <MessageButton user={profile.user} className="btn" />
            <button
              onClick={blockUser}
              className="btn-outline text-red-600 border-red-600 hover:bg-red-50"
            >
              Chặn người này
            </button>
          </div>
        );
    }
  }

  if (loading) {
    return (
      <div className="w-full px-6 py-6">
        <div className="card max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-6 py-6">
        <div className="card max-w-2xl mx-auto">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <button onClick={() => navigate("/")} className="btn mt-4">
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const user = profile.user;
  const roleIcons = {
    solo: "/assets/Sung-tick.png",
    sybau: "/assets/Sybau-tick.png",
    keeper: "/assets/moxumxue.png",
  };

  // Nếu bị block thì ẩn toàn bộ thông tin
  if (user?.theyBlockedMe) {
    return (
      <div className="card max-w-2xl mx-auto p-6 text-center text-gray-600">
        Người dùng này đã chặn bạn.
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 pt-24">
      <div className="card max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <img
            src={
              user.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user.name
              )}&background=cccccc&color=222222&size=128`
            }
            alt="avatar"
            className="w-20 h-20 rounded-full object-cover border-2 border-gray-300 bg-gray-100"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-1">
              {user.name}
              {(user.role === "solo" ||
                user.role === "sybau" ||
                user.role === "keeper") && (
                <img
                  src={roleIcons[user.role]}
                  alt="Tích xanh"
                  className="w-6 h-6 rounded-full"
                />
              )}
            </h1>
            <p className="text-gray-600 mb-3">
              {profile.friendshipStatus === "friends"
                ? "Đã là bạn bè"
                : "Chưa là bạn bè"}
            </p>
            {renderFriendButton()}
          </div>
        </div>

        {/* Profile Info */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Thông tin cá nhân</h2>
          <div className="space-y-3">
            {user.birthday && (
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-gray-500" />
                <span>
                  Sinh nhật:{" "}
                  {new Date(user.birthday).toLocaleDateString("vi-VN")}
                </span>
              </div>
            )}
            {user.gender && (
              <div className="flex items-center gap-3">
                <Heart size={18} className="text-gray-500" />
                <span>
                  Giới tính:{" "}
                  {user.gender === "male"
                    ? "Nam"
                    : user.gender === "female"
                    ? "Nữ"
                    : "Khác"}
                </span>
              </div>
            )}
            {user.hobbies && (
              <div className="flex items-start gap-3">
                <Heart size={18} className="text-gray-500 mt-0.5" />
                <div>
                  <span className="font-medium">Sở thích:</span>
                  <p className="text-gray-600 mt-1">{user.hobbies}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-gray-500" />
              <span>
                Tham gia:{" "}
                {new Date(user.createdAt).toLocaleDateString("vi-VN")}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
