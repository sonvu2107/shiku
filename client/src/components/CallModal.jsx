import React, { useRef, useEffect, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  User
} from "lucide-react";
import socketService from "../socket";

/**
 * CallModal - Modal cuộc gọi video/voice với WebRTC (Facebook style)
 * @param {Object} props - Component props
 */
export default function CallModal({
  open,
  onClose,
  isVideo = true,
  remoteUser,
  socket,
  conversationId,
  incomingOffer,
  isGroupCall = false,
  groupParticipants = []
}) {
  // ==================== REFS & STATE ====================
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const remoteAudioRef = useRef(); // Separate audio element for voice calls
  const peerRef = useRef();

  const [callState, setCallState] = useState("connecting");
  const [localStream, setLocalStream] = useState(null);
  const [error, setError] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callTimeout, setCallTimeout] = useState(null);
  const [fallbackTimeout, setFallbackTimeout] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false); // Trạng thái phóng to video

  // Call duration timer
  useEffect(() => {
    let interval;
    if (callState === "active") {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  // Initialize call
  useEffect(() => {
    if (!open) return;

    let mounted = true;

    async function initCall() {
      try {
        setError(null);
        setCallDuration(0);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideo,
          audio: true,
        });

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const peer = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        peerRef.current = peer;

        stream.getTracks().forEach(track => peer.addTrack(track, stream));

        peer.ontrack = (e) => {
          if (!mounted) return;

          // Set remote stream to appropriate element
          if (isVideo && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = e.streams[0];
          } else if (!isVideo && remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = e.streams[0];
          }
        };

        peer.onicecandidate = (e) => {
          if (e.candidate && mounted) {
            socketService.emitCallCandidate(e.candidate, conversationId);
          }
        };

        peer.onconnectionstatechange = () => {
          if (!mounted) return;

          if (peer.connectionState === 'connected') {
            if (fallbackTimeout) {
              clearTimeout(fallbackTimeout);
              setFallbackTimeout(null);
            }
            setCallState("active");
          } else if (peer.connectionState === 'failed') {
            setError("Kết nối thất bại");
            setCallState("error");
          } else if (peer.connectionState === 'disconnected') {
            setCallState("ended");
          }
        };

        const fbTimeout = setTimeout(() => {
          if (mounted && peerRef.current?.connectionState === 'connecting') {
            setCallState("active");
          }
        }, 10000);
        setFallbackTimeout(fbTimeout);

        if (incomingOffer) {
          try {
            await peer.setRemoteDescription(new RTCSessionDescription(incomingOffer));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);

            if (mounted) {
              socketService.emitCallAnswer(answer, conversationId);
            }
          } catch (error) {
            if (mounted) {
              setError("Không thể thiết lập kết nối");
              setCallState("error");
            }
          }
        } else {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);

          if (mounted) {
            socketService.emitCallOffer(offer, conversationId, isVideo);
          }

          const cTimeout = setTimeout(() => {
            if (mounted && peerRef.current?.connectionState === 'connecting') {
              setError("Không có phản hồi từ người nhận");
              setCallState("error");
            }
          }, 30000);

          setCallTimeout(cTimeout);
        }
      } catch (error) {
        if (mounted) {
          setError(error.message || "Không thể khởi tạo cuộc gọi");
          setCallState("error");
        }
      }
    }

    initCall();

    return () => {
      mounted = false;

      if (callTimeout) {
        clearTimeout(callTimeout);
        setCallTimeout(null);
      }
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout);
        setFallbackTimeout(null);
      }

      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        setLocalStream(null);
      }

      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }

      setCallState("connecting");
      setCallDuration(0);
      setError(null);
    };
  }, [open, isVideo, incomingOffer, conversationId]);

  // Listen for answer/candidate
  useEffect(() => {
    if (!open) return;

    const socket = socketService.socket;
    if (!socket) {
      return;
    }

    const handleAnswer = ({ answer }) => {
      if (!answer || !answer.type || !answer.sdp) {
        return;
      }

      if (callTimeout) {
        clearTimeout(callTimeout);
        setCallTimeout(null);
      }

      if (peerRef.current) {
        peerRef.current.setRemoteDescription(new RTCSessionDescription(answer))
          .catch((error) => {
            setError("Không thể thiết lập kết nối");
            setCallState("error");
          });
      }
    };

    const handleCandidate = ({ candidate }) => {
      if (!candidate) {
        return;
      }

      if (peerRef.current && peerRef.current.connectionState !== 'closed') {
        peerRef.current.addIceCandidate(new RTCIceCandidate(candidate))
          .catch((error) => {
            // Ignore ICE candidate errors
          });
      }
    };

    const handleEnd = () => {
      setCallState("ended");
      onClose();
    };

    socket.off("call-answer", handleAnswer);
    socket.off("call-candidate", handleCandidate);
    socket.off("call-end", handleEnd);

    socket.on("call-answer", handleAnswer);
    socket.on("call-candidate", handleCandidate);
    socket.on("call-end", handleEnd);

    return () => {
      socket.off("call-answer", handleAnswer);
      socket.off("call-candidate", handleCandidate);
      socket.off("call-end", handleEnd);
    };
  }, [open, onClose]);

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle end call
  const handleEndCall = () => {
    socketService.emitCallEnd(conversationId);
    onClose();
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream && isVideo) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const remoteAvatar = remoteUser?.avatarUrl || remoteUser?.avatar || remoteUser?.profilePicture;
  const remoteDisplayName = remoteUser?.name || remoteUser?.username || "Người dùng";
  const remoteInitial = remoteDisplayName.charAt(0)?.toUpperCase() || "?";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900 dark:bg-black">
      {/* Hidden audio element for voice calls */}
      {!isVideo && (
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          className="hidden"
        />
      )}

      {/* Remote video background - click để phóng to */}
      <div
        className={`absolute inset-0 ${isVideo ? 'cursor-pointer' : ''}`}
        onClick={isVideo ? toggleFullscreen : undefined}
      >
        {isVideo ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-900 dark:to-black flex items-center justify-center">
            {/* Voice call - hiển thị avatar */}
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-40 h-40 rounded-full border-4 border-white dark:border-gray-200 shadow-2xl overflow-hidden bg-gradient-to-br from-gray-400 to-gray-600 dark:from-gray-600 dark:to-gray-800">
                {remoteAvatar ? (
                  <img
                    src={remoteAvatar}
                    alt={remoteDisplayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold">
                    {remoteInitial}
                  </div>
                )}
              </div>
              <div className="text-white dark:text-gray-100 text-3xl font-semibold">{remoteDisplayName}</div>
              <div className="text-gray-300 dark:text-gray-400 text-lg">Cuộc gọi thoại</div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 dark:from-black/70 dark:via-transparent dark:to-black/90 pointer-events-none" />

      {/* Header - fixed top */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar nhỏ */}
            <div className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-200 shadow-lg overflow-hidden bg-gradient-to-br from-gray-400 to-gray-600 dark:from-gray-600 dark:to-gray-800">
              {remoteAvatar ? (
                <img
                  src={remoteAvatar}
                  alt={remoteDisplayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                  {remoteInitial}
                </div>
              )}
            </div>
            <div>
              <div className="text-white dark:text-gray-100 font-semibold text-lg">{remoteDisplayName}</div>
              <div className="text-gray-300 dark:text-gray-400 text-sm">
                {callState === "connecting" && "Đang kết nối..."}
                {callState === "active" && formatDuration(callDuration)}
                {callState === "error" && (error || "Lỗi kết nối")}
                {callState === "ended" && "Đã kết thúc"}
              </div>
            </div>
          </div>

          {/* Fullscreen toggle cho video call */}
          {isVideo && (
            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 rounded-full bg-gray-800/50 dark:bg-gray-700/50 hover:bg-gray-700/70 dark:hover:bg-gray-600/70 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
              title={isFullscreen ? "Thu nhỏ" : "Phóng to"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Local video - picture in picture */}
      {(isVideo || !isVideo) && !isFullscreen && (
        <div className="absolute top-24 right-6 z-20 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white dark:border-gray-200 shadow-2xl bg-gray-800 dark:bg-gray-900">
          {isVideo ? (
            <>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-400 gap-2">
                  <VideoOff className="w-8 h-8" />
                  <span className="text-xs">Camera tắt</span>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-400 gap-2">
              <User className="w-8 h-8" />
              <span className="text-xs">Bạn</span>
            </div>
          )}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/60 dark:bg-black/70 px-2 py-1 rounded-full">
            <span className="text-white text-xs font-medium">Bạn</span>
          </div>
        </div>
      )}

      {/* Controls - fixed bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-8">
        <div className="flex items-center justify-center gap-6">
          {/* Mute button */}
          <button
            onClick={toggleMute}
            className={`group relative w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700'
                : 'bg-gray-800/50 dark:bg-gray-700/50 hover:bg-gray-700/70 dark:hover:bg-gray-600/70 backdrop-blur-sm'
            }`}
            title={isMuted ? "Bật tiếng" : "Tắt tiếng"}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Video toggle */}
          {isVideo && (
            <button
              onClick={toggleVideo}
              className={`group relative w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isVideoOff
                  ? 'bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700'
                  : 'bg-gray-800/50 dark:bg-gray-700/50 hover:bg-gray-700/70 dark:hover:bg-gray-600/70 backdrop-blur-sm'
              }`}
              title={isVideoOff ? "Bật camera" : "Tắt camera"}
            >
              {isVideoOff ? (
                <VideoOff className="w-6 h-6 text-white" />
              ) : (
                <Video className="w-6 h-6 text-white" />
              )}
            </button>
          )}

          {/* End call button */}
          <button
            onClick={handleEndCall}
            className="group relative w-16 h-16 rounded-full bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 flex items-center justify-center transition-all shadow-lg shadow-red-500/30 dark:shadow-red-600/30 hover:shadow-xl hover:shadow-red-500/50 dark:hover:shadow-red-600/50"
            title="Kết thúc"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && callState === "error" && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-red-500/90 dark:bg-red-600/90 backdrop-blur-sm text-white px-6 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
