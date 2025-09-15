import React, { useRef, useEffect, useState } from "react";
import socketService from "../socket";

/**
 * CallModal - Modal cuộc gọi video/voice với WebRTC
 * Quản lý kết nối WebRTC, hiển thị video/audio streams
 * @param {Object} props - Component props
 * @param {boolean} props.open - Trạng thái hiển thị modal
 * @param {Function} props.onClose - Callback đóng modal
 * @param {boolean} props.isVideo - Loại cuộc gọi (video/voice)
 * @param {Object} props.remoteUser - Thông tin người dùng đối phương (1-1 call)
 * @param {Object} props.socket - Socket.IO instance (deprecated, using socketService)
 * @param {string} props.conversationId - ID cuộc trò chuyện
 * @param {Object} props.incomingOffer - Offer từ người gọi (nếu là callee)
 * @param {boolean} props.isGroupCall - Có phải group call không
 * @param {Array} props.groupParticipants - Danh sách participants trong group call
 * @returns {JSX.Element|null} Component modal hoặc null nếu không hiển thị
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
  
  // Video refs
  const localVideoRef = useRef(); // Video element cho stream local
  const remoteVideoRef = useRef(); // Video element cho stream remote
  const peerRef = useRef(); // RTCPeerConnection instance
  
  // Call states
  const [callState, setCallState] = useState("connecting"); // connecting | active | ended | error
  const [localStream, setLocalStream] = useState(null); // Local media stream
  const [error, setError] = useState(null); // Error message
  const [callDuration, setCallDuration] = useState(0); // Call duration in seconds
  const [isMuted, setIsMuted] = useState(false); // Audio mute state
  const [isVideoOff, setIsVideoOff] = useState(false); // Video off state
  const [callTimeout, setCallTimeout] = useState(null); // Call timeout reference
  const [fallbackTimeout, setFallbackTimeout] = useState(null); // Fallback timeout reference

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

  useEffect(() => {
    if (!open) return;

    async function initCall() {
      try {
        console.log("🎥 Initializing call. incomingOffer?", !!incomingOffer);
        setError(null);
        setCallDuration(0);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideo,
          audio: true,
        });
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
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = e.streams[0];
          }
        };

        peer.onicecandidate = (e) => {
          if (e.candidate) {
            socketService.emitCallCandidate(e.candidate, conversationId);
          }
        };

        peer.onconnectionstatechange = () => {
          if (peer.connectionState === 'connected') {
            // Clear fallback timeout since connection is successful
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

        // Fallback timeout - nếu WebRTC không connect sau 10s thì force active
        const timeout = setTimeout(() => {
          if (callState === "connecting") {
            setCallState("active");
          }
        }, 10000); // 10 seconds fallback
        setFallbackTimeout(timeout);

        if (incomingOffer) {
          // Callee flow
          try {
            await peer.setRemoteDescription(new RTCSessionDescription(incomingOffer));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socketService.emitCallAnswer(answer, conversationId);
          } catch (error) {
            setError("Không thể thiết lập kết nối - SDP không hợp lệ");
            setCallState("error");
          }
        } else {
          // Caller flow
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socketService.emitCallOffer(offer, conversationId, isVideo);
          
          // Set timeout for caller - nếu không nhận được answer trong 30s
          const timeout = setTimeout(() => {
            if (callState === "connecting") {
              setError("Không có phản hồi từ người nhận");
              setCallState("error");
            }
          }, 30000); // 30 seconds timeout
          
          setCallTimeout(timeout);
        }
      } catch (error) {
        setError(error.message || "Không thể khởi tạo cuộc gọi");
        setCallState("error");
      }
    }

    initCall();

    return () => {
      if (peerRef.current) peerRef.current.close();
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      if (callTimeout) {
        clearTimeout(callTimeout);
        setCallTimeout(null);
      }
      // Cleanup fallback timeout
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout);
      }
      // NOTE: Không rời conversation room khi kết thúc cuộc gọi
      // User cần ở trong room để nhận được incoming calls
    };
  }, [open, isVideo, incomingOffer, conversationId]);

  // Lắng nghe answer/candidate
  useEffect(() => {
    if (!open) return;

    const socket = socketService.socket;
    if (!socket) {
      console.warn("⚠️ Socket not available for call listeners");
      return;
    }

    const handleAnswer = ({ answer }) => {
      // Clear call timeout
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
      if (peerRef.current) {
        peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const handleEnd = () => {
      setCallState("ended");
      onClose();
    };

    socket.on("call-answer", handleAnswer);
    socket.on("call-candidate", handleCandidate);
    socket.on("call-end", handleEnd);

    return () => {
      socket.off("call-answer", handleAnswer);
      socket.off("call-candidate", handleCandidate);
      socket.off("call-end", handleEnd);
    };
  }, [open]);

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle call end
  const handleEndCall = () => {
    socketService.emitCallEnd(conversationId);
    // NOTE: Không rời conversation room khi kết thúc cuộc gọi
    // User cần ở trong room để nhận được incoming calls
    onClose();
  };

  // Toggle audio mute
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/30 to-purple-500/30"></div>
        </div>
        
        {/* Close Button */}
        <button
          className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors z-10 bg-black/20 rounded-full p-2 backdrop-blur-sm"
          onClick={onClose}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Header */}
        <div className="mb-8 text-center relative z-10">
          <div className="font-bold text-2xl text-white mb-2">
            {isVideo ? "Video Call" : "Voice Call"}
            {isGroupCall && " (Group)"}
          </div>
          <div className="text-white/90 text-lg">
            {isGroupCall ? (
              <div>
                <div className="mb-2">{groupParticipants.length} participants</div>
                <div className="text-sm text-white/70">
                  {groupParticipants.slice(0, 3).map(p => p.name).join(", ")}
                  {groupParticipants.length > 3 && ` +${groupParticipants.length - 3} more`}
                </div>
              </div>
            ) : (
              remoteUser?.name || "Người dùng"
            )}
          </div>
          {callState === "active" && (
            <div className="text-white/70 text-lg mt-3 font-mono">
              {formatDuration(callDuration)}
            </div>
          )}
        </div>
        {/* Video/Audio Display */}
        <div className="flex flex-col items-center w-full mb-12">
          {isGroupCall ? (
            /* Group Call Display */
            <div className="w-full max-w-4xl">
              {/* Participants Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {groupParticipants.map((participant, index) => (
                  <div key={participant.id || index} className="relative">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden shadow-xl border-2 border-white/20">
                      {isVideo ? (
                        <video
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                          style={{ display: "block" }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Participant name */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 rounded-b-2xl">
                      <div className="truncate">{participant.name}</div>
                    </div>
                    {/* Online indicator */}
                    <div className="absolute top-2 right-2 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                ))}
              </div>
              
              {/* Local User (Picture-in-Picture) */}
              <div className="absolute top-6 right-6">
                <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-xl border-2 border-white/30">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ display: isVideo ? "block" : "none" }}
                  />
                  {!isVideo && (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-2xl text-center">
                  You
                </div>
              </div>
            </div>
          ) : (
            /* 1-1 Call Display */
            <>
              {/* Remote User (Main) */}
              <div className="relative mb-8">
                <div className="w-48 h-48 rounded-full overflow-hidden shadow-2xl border-4 border-white/20">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ display: isVideo ? "block" : "none" }}
                  />
                  {!isVideo && (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                    </div>
                  )}
                </div>
                {/* Online indicator */}
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>
              
              {/* Local User (Picture-in-Picture) */}
              <div className="absolute top-6 left-6">
                <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-xl border-2 border-white/30">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ display: isVideo ? "block" : "none" }}
                  />
                  {!isVideo && (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        {/* Status Indicator */}
        <div className="mb-8 text-center">
          {callState === "connecting" && (
            <div className="flex items-center justify-center gap-3">
              <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-white/80 font-medium text-lg">Connecting...</span>
            </div>
          )}
          {callState === "active" && (
            <div className="flex items-center justify-center gap-3">
              <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-white/80 font-medium text-lg">Connected</span>
            </div>
          )}
          {callState === "ended" && (
            <div className="flex items-center justify-center gap-3">
              <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
              <span className="text-white/60 font-medium text-lg">Call Ended</span>
            </div>
          )}
          {callState === "error" && (
            <div className="flex items-center justify-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-red-300 font-medium text-lg">
                {error || "Connection Error"}
              </span>
            </div>
          )}
        </div>


        
        {/* Call Controls */}
        {(callState === "active" || callState === "connecting") && (
          <div className="flex gap-4 justify-center items-center relative z-20">
            {/* Mute Button */}
            <button
              className={`w-12 h-12 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer pointer-events-auto ${
                isMuted 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
              }`}
              onClick={toggleMute}
              title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                {isMuted ? (
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                ) : (
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                )}
              </svg>
            </button>
            
            {/* Video Toggle Button (Video calls only) */}
            {isVideo && (
              <button
                className={`w-12 h-12 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer pointer-events-auto ${
                  isVideoOff 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
                }`}
                onClick={toggleVideo}
                title={isVideoOff ? 'Bật camera' : 'Tắt camera'}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  {isVideoOff ? (
                    <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.55-.18L19.73 21 21 19.73 3.27 2zM5 16V8h1.73l8 8H5z"/>
                  ) : (
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                  )}
                </svg>
              </button>
            )}
            
            {/* End Call Button */}
            <button
              className="w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all duration-200 flex items-center justify-center shadow-lg shadow-red-500/30 hover:shadow-red-500/50 cursor-pointer pointer-events-auto"
              onClick={handleEndCall}
              title="Kết thúc cuộc gọi"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
              </svg>
            </button>
          </div>
        )}
        
        {/* Close Button (for non-active states) */}
        {callState !== "active" && callState !== "connecting" && (
          <div className="mt-6 flex justify-center">
            <button
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-xl transition-all duration-200 font-medium"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        )} 
      </div>
    </div>
  );
}
