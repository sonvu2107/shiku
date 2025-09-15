import React, { useRef, useEffect, useState } from "react";

/**
 * CallModal - Modal cuộc gọi video/voice với WebRTC
 * Quản lý kết nối WebRTC, hiển thị video/audio streams
 * @param {Object} props - Component props
 * @param {boolean} props.open - Trạng thái hiển thị modal
 * @param {Function} props.onClose - Callback đóng modal
 * @param {boolean} props.isVideo - Loại cuộc gọi (video/voice)
 * @param {Object} props.remoteUser - Thông tin người dùng đối phương
 * @param {Object} props.socket - Socket.IO instance
 * @param {string} props.conversationId - ID cuộc trò chuyện
 * @param {Object} props.incomingOffer - Offer từ người gọi (nếu là callee)
 * @returns {JSX.Element|null} Component modal hoặc null nếu không hiển thị
 */
export default function CallModal({
  open,
  onClose,
  isVideo = true,
  remoteUser,
  socket,
  conversationId,
  incomingOffer
}) {
  // ==================== REFS & STATE ====================
  
  // Video refs
  const localVideoRef = useRef(); // Video element cho stream local
  const remoteVideoRef = useRef(); // Video element cho stream remote
  const peerRef = useRef(); // RTCPeerConnection instance
  
  // Call states
  const [callState, setCallState] = useState("connecting"); // connecting | active | ended
  const [localStream, setLocalStream] = useState(null); // Local media stream

  useEffect(() => {
    if (!open) return;

    async function initCall() {
      console.log("🎥 Initializing call. incomingOffer?", !!incomingOffer);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      stream.getTracks().forEach(track => peer.addTrack(track, stream));

      peer.ontrack = (e) => {
        console.log("📡 Remote track received:", e.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
        }
      };

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          console.log("📡 Sending candidate:", e.candidate);
          socket.emit("call-candidate", { candidate: e.candidate, conversationId });
        }
      };

      if (incomingOffer) {
        // Callee flow
        console.log("📞 I am CALLEE, setting remote description");
        await peer.setRemoteDescription(new RTCSessionDescription(incomingOffer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        console.log("📞 Sending answer to caller");
        socket.emit("call-answer", { answer, conversationId });
        setCallState("active");
      } else {
        // Caller flow
        console.log("📞 I am CALLER, creating offer");
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        console.log("📞 Sending offer to callee");
        socket.emit("call-offer", { offer, conversationId, isVideo });
      }
    }

    initCall();

    return () => {
      console.log("❌ Cleaning up call");
      if (peerRef.current) peerRef.current.close();
      if (localStream) localStream.getTracks().forEach(t => t.stop());
    };
  }, [open, isVideo, incomingOffer]);

  // Lắng nghe answer/candidate
  useEffect(() => {
    if (!socket || !open) return;

    const handleAnswer = ({ answer }) => {
      console.log("📞 Received answer from callee", answer);
      if (peerRef.current) {
        peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState("active");
      }
    };

    const handleCandidate = ({ candidate }) => {
      console.log("📡 Received candidate:", candidate);
      if (peerRef.current) {
        peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const handleEnd = () => {
      console.log("❌ Received call-end");
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
  }, [socket, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-6 min-w-[320px] max-w-[95vw] flex flex-col items-center relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-black"
          onClick={onClose}
        >
          ✕
        </button>
        <div className="mb-2 font-semibold text-lg">
          {isVideo ? "Video Call" : "Voice Call"} với{" "}
          {remoteUser?.name || "Người dùng"}
        </div>
        <div className="flex gap-4 items-center">
          <div>
            <div className="text-xs text-gray-500 mb-1">Bạn</div>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-32 h-32 bg-black rounded-lg object-cover"
              style={{ display: isVideo ? "block" : "none" }}
            />
            {!isVideo && (
              <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center text-4xl">
                🎤
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">
              {remoteUser?.name || "Đối phương"}
            </div>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-32 h-32 bg-black rounded-lg object-cover"
              style={{ display: isVideo ? "block" : "none" }}
            />
            {!isVideo && (
              <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center text-4xl">
                🎤
              </div>
            )}
          </div>
        </div>
        <div className="mt-4">
          {callState === "connecting" && (
            <span className="text-yellow-600">Đang kết nối...</span>
          )}
          {callState === "active" && (
            <span className="text-green-600">Đang gọi...</span>
          )}
          {callState === "ended" && (
            <span className="text-red-600">Cuộc gọi đã kết thúc</span>
          )}
        </div>
        <button
          className="mt-6 px-4 py-2 bg-red-500 text-white rounded-lg"
          onClick={onClose}
        >
          Kết thúc
        </button> 
      </div>
    </div>
  );
}
