import { UserCheck, UserX, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function FriendRequestCard({ request, onAccept, onReject }) {
  const { from, createdAt, status } = request;
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-3">
        <img
          src={from.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(from.name)}&background=cccccc&color=222222&size=64`}
          alt="avatar"
          className="w-12 h-12 rounded-full object-cover border border-gray-300 bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate(`/user/${from._id}`)}
        />
        <div className="flex-1">
          <Link 
            to={`/user/${from._id}`}
            className="font-semibold text-gray-800 hover:text-blue-600"
          >
            {from.name}
          </Link>
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Clock size={14} />
            {new Date(createdAt).toLocaleDateString('vi-VN')}
          </div>
        </div>
      </div>

      {status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onAccept(request._id)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <UserCheck size={16} />
            Chấp nhận
          </button>
          <button
            onClick={() => onReject(request._id)}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <UserX size={16} />
            Từ chối
          </button>
        </div>
      )}

      {status === 'accepted' && (
        <div className="text-center text-green-600 font-medium">
          ✓ Đã chấp nhận
        </div>
      )}

      {status === 'rejected' && (
        <div className="text-center text-red-600 font-medium">
          ✗ Đã từ chối
        </div>
      )}
    </div>
  );
}
