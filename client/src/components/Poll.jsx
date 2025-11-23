import { useState, useEffect } from "react";
import { api } from "../api";
import { BarChart3, Users, Clock, CheckCircle2, Plus, X } from "lucide-react";
import { useSocket } from "../hooks/useSocket";

/**
 * Poll Component - Hiển thị poll/survey với realtime voting
 * @param {Object} post - Post object chứa poll
 * @param {Object} user - Người dùng hiện tại
 */
export default function Poll({ post, user }) {
  const [pollData, setPollData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [showVoters, setShowVoters] = useState(null); 
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [newOptions, setNewOptions] = useState([""]);
  const [addingOptions, setAddingOptions] = useState(false);
  const socket = useSocket();

  // Tải dữ liệu cuộc bình chọn
  useEffect(() => {
    const loadPoll = async () => {
      try {
        const response = await api(`/api/polls/post/${post._id}`);
        setPollData(response.poll);
      } catch (error) {
        console.error("Error loading poll:", error);
      } finally {
        setLoading(false);
      }
    };

    if (post.hasPoll) {
      loadPoll();
    } else {
      setLoading(false);
    }
  }, [post._id, post.hasPoll]);

  // Socket.io realtime updates
  useEffect(() => {
    if (!socket || !pollData) return;

    // Tham gia vào phòng bình chọn
    socket.emit("join-poll", pollData._id);

    // Lắng nghe các cập nhật bình chọn
    const handlePollUpdate = (data) => {
      if (data.pollId?.toString() === pollData._id?.toString()) {
        // Cập nhật kết quả
        setPollData(prev => ({
          ...prev,
          results: data.results,
          totalVotes: data.totalVotes
        }));
      }
    };

    socket.on("poll-update", handlePollUpdate);

    // Dọn dẹp
    return () => {
      socket.off("poll-update", handlePollUpdate);
      socket.emit("leave-poll", pollData._id);
    };
  }, [socket, pollData]);

  // Xử lý phiếu bầu
  const handleVote = async (optionIndex) => {
    if (!user) {
      alert("Vui lòng đăng nhập để bình chọn");
      return;
    }

    if (!pollData.isActive) {
      alert("Bình chọn đã đóng");
      return;
    }

    // Kiểm tra hết hạn
    if (pollData.expiresAt && new Date() >= new Date(pollData.expiresAt)) {
      alert("Bình chọn đã hết hạn");
      return;
    }

    setVoting(true);
    try {
      const response = await api(`/api/polls/${pollData._id}/vote`, {
        method: "POST",
        body: { optionIndex }
      });

      // Cập nhật dữ liệu bình chọn sau khi bầu
      setPollData(response.poll);
    } catch (error) {
      console.error("Error voting:", error);
      alert(error.message || "Lỗi khi lựa chọn");
    } finally {
      setVoting(false);
    }
  };

  // Handle add options
  const handleAddOptions = async () => {
    if (!user) {
      alert("Vui lòng đăng nhập để thêm lựa chọn");
      return;
    }

    const validOptions = newOptions.filter(opt => opt.trim());
    if (validOptions.length === 0) {
      alert("Vui lòng nhập ít nhất một lựa chọn");
      return;
    }

    if (!pollData || !pollData._id) {
      alert("Không tìm thấy thông tin bình chọn");
      return;
    }

    setAddingOptions(true);
    try {
      const response = await api(`/api/polls/${pollData._id}/options`, {
        method: "POST",
        body: { options: validOptions }
      });

      // Update local poll data
      setPollData(response.poll);
      setShowAddOptions(false);
      setNewOptions([""]);
    } catch (error) {
      console.error("Error adding options:", error);
      alert(error.message || "Lỗi khi thêm lựa chọn");
    } finally {
      setAddingOptions(false);
    }
  };

  // Format time remaining
  const getTimeRemaining = () => {
    if (!pollData.expiresAt) return null;

    const now = new Date();
    const expiry = new Date(pollData.expiresAt);
    const diff = expiry - now;

    if (diff <= 0) return "Đã hết hạn";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `Còn ${days} ngày ${hours} giờ`;
    if (hours > 0) return `Còn ${hours} giờ`;
    return `Còn ${Math.floor(diff / (1000 * 60))} phút`;
  };

  if (!post.hasPoll || loading) return null;
  if (!pollData || !pollData.results) return null;

  const hasVoted = pollData.userVote !== null && pollData.userVote !== undefined;
  const userVotedIndex = pollData.userVote?.optionIndex;

  return (
    <div className="bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-3 sm:p-4 space-y-3 sm:space-y-4">
      {/* Poll Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <BarChart3 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
          <h3 className="font-semibold text-gray-900 dark:text-white break-words">{pollData.question}</h3>
        </div>
        {!pollData.isActive && (
          <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded whitespace-nowrap">
            Đã đóng
          </span>
        )}
      </div>

      {/* Poll Info */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <Users size={16} />
          <span>{pollData.totalVotes} lượt lựa chọn</span>
        </div>
        {pollData.expiresAt && (
          <div className="flex items-center gap-1">
            <Clock size={16} />
            <span>{getTimeRemaining()}</span>
          </div>
        )}
        {pollData.allowMultipleVotes && (
          <span className="text-xs bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
            Chọn nhiều
          </span>
        )}
      </div>

      {/* Poll Options */}
      <div className="space-y-2">
        {pollData.results.map((option, index) => {
          const isUserVoted = userVotedIndex === index;
          const canVote = user && pollData.isActive;
          const isMultipleVote = pollData.allowMultipleVotes;

          return (
            <div key={index} className="space-y-1">
              <button
                onClick={() => canVote && handleVote(index)}
                disabled={voting || !canVote}
                aria-label={`Vote cho ${option.text}`}
                title={canVote ? `Click để lựa chọn cho "${option.text}"` : hasVoted ? "Bạn đã lựa chọn" : "Đăng nhập để lựa chọn"}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all relative overflow-hidden ${
                  isUserVoted
                    ? "border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                    : hasVoted && !isMultipleVote
                    ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-default"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-500/5"
                } ${voting ? "opacity-50 cursor-wait" : ""} ${
                  !canVote ? "cursor-default" : "cursor-pointer"
                }`}
              >
                {/* Progress Bar Background */}
                {hasVoted && (
                  <div
                    className="absolute inset-0 bg-blue-100 dark:bg-blue-500/20 transition-all duration-500"
                    style={{ width: `${option.percentage}%` }}
                  />
                )}

                {/* Option Content */}
                <div className="relative flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    {isUserVoted && (
                      <CheckCircle2 className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={18} />
                    )}
                    <span className="font-medium text-gray-900 dark:text-white">{option.text}</span>
                    {isMultipleVote && isUserVoted && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-500/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                        Đã chọn
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {hasVoted && (
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {option.percentage}%
                      </span>
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({option.voteCount})
                    </span>
                  </div>
                </div>
              </button>

              {/* Show Voters (if public and has voters) */}
              {pollData.isPublic && option.voters && option.voteCount > 0 && (
                <div>
                  <button
                    onClick={() => setShowVoters(showVoters === index ? null : index)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 ml-3"
                  >
                    {showVoters === index ? "Ẩn" : "Xem"} {option.voteCount} người đã lựa chọn
                  </button>

                  {/* Voters List */}
                  {showVoters === index && (
                    <div className="ml-3 mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1 max-h-40 overflow-y-auto border border-gray-100 dark:border-gray-700">
                      {option.voters.map((voter, vIdx) => (
                        <div key={vIdx} className="flex items-center gap-2 text-sm">
                          <img
                            src={
                              voter.user?.avatarUrl ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                voter.user?.name || "User"
                              )}&background=cccccc&color=222222&size=24`
                            }
                            alt={voter.user?.name}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-gray-700 dark:text-gray-300">{voter.user?.name}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(voter.votedAt).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Options Section - Only show for post owner/admin */}
      {user && pollData.isActive && (user._id === post.author?._id || user.role === "admin") && pollData.results.length < 10 && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          {!showAddOptions ? (
            <button
              onClick={() => setShowAddOptions(true)}
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              <span>Thêm lựa chọn</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Thêm lựa chọn mới:
                </label>
                {newOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2 group">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder={`Lựa chọn ${index + 1}...`}
                        value={option}
                        onChange={(e) => {
                          const newOpts = [...newOptions];
                          newOpts[index] = e.target.value;
                          setNewOptions(newOpts);
                        }}
                        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        maxLength={200}
                      />
                      {option.trim() && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                    {newOptions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = newOptions.filter((_, i) => i !== index);
                          setNewOptions(newOpts);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity p-1 rounded"
                        title="Xóa lựa chọn này"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
                
                {newOptions.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setNewOptions([...newOptions, ""])}
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-3 py-2 rounded-lg transition-colors border border-dashed border-blue-300 dark:border-blue-500/50 hover:border-blue-400"
                  >
                    <Plus size={16} />
                    <span>Thêm lựa chọn</span>
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddOptions}
                  disabled={addingOptions}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {addingOptions ? "Đang thêm..." : "Thêm lựa chọn"}
                </button>
                <button
                  onClick={() => {
                    setShowAddOptions(false);
                    setNewOptions([""]);
                  }}
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      {!user && pollData.isActive && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center pt-2 border-t border-gray-200 dark:border-gray-700">
          Đăng nhập để lựa chọn
        </p>
      )}
    </div>
  );
}
