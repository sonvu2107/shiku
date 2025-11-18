/**
 * Shiku Knowledge Base
 * Thông tin về website Shiku để chatbot có thể trả lời câu hỏi về website
 */

export const SHIKU_KNOWLEDGE_BASE = {
  // Thông tin cơ bản về website
  website: {
    name: "Shiku",
    description: "Mạng xã hội hiện đại kết nối bạn bè",
    url: "https://shiku.click",
    tagline: "Mạng xã hội kết nối bạn bè",
    language: "Tiếng Việt",
  },

  // Tính năng chính
  features: {
    // Mạng xã hội cơ bản
    posts: {
      name: "Bài viết (Posts)",
      description: "Người dùng có thể tạo, chỉnh sửa, xóa bài viết với hỗ trợ văn bản, hình ảnh và video",
      capabilities: [
        "Đăng bài viết với văn bản, hình ảnh, video",
        "Chỉnh sửa và xóa bài viết",
        "Bình luận lồng nhau (nested comments)",
        "Thả cảm xúc (emotes/reactions)",
        "Lưu bài viết yêu thích",
        "Tìm kiếm và lọc bài viết",
        "Sắp xếp theo mới nhất/cũ nhất/xem nhiều nhất/nhiều tương tác nhất",
      ],
    },
    stories: {
      name: "Stories",
      description: "Chia sẻ khoảnh khắc ngắn giống Instagram/Facebook Stories",
      capabilities: [
        "Tạo story với hình ảnh/video",
        "Xem stories của bạn bè",
        "Stories tự động hết hạn sau 24 giờ",
      ],
    },
    comments: {
      name: "Bình luận (Comments)",
      description: "Hệ thống bình luận lồng nhau với khả năng reply, edit, delete",
      capabilities: [
        "Bình luận trên bài viết",
        "Reply bình luận (nested comments)",
        "Chỉnh sửa và xóa bình luận",
        "Thả cảm xúc cho bình luận",
      ],
    },

    // Hệ thống người dùng
    authentication: {
      name: "Xác thực (Authentication)",
      description: "Đăng ký, đăng nhập, quên mật khẩu với JWT tokens",
      capabilities: [
        "Đăng ký tài khoản mới",
        "Đăng nhập với email và mật khẩu",
        "Quên mật khẩu và reset",
        "JWT authentication với access và refresh tokens",
      ],
    },
    profile: {
      name: "Trang cá nhân (Profile)",
      description: "Trang cá nhân với avatar, bio, thông tin cá nhân",
      capabilities: [
        "Xem và chỉnh sửa profile",
        "Upload avatar",
        "Cập nhật thông tin cá nhân",
        "Xem bài viết đã đăng",
        "Xem media gallery",
      ],
    },
    friends: {
      name: "Bạn bè (Friends)",
      description: "Gửi/nhận lời mời kết bạn, xem danh sách bạn bè, bạn bè online",
      capabilities: [
        "Gửi lời mời kết bạn",
        "Chấp nhận/từ chối lời mời kết bạn",
        "Xem danh sách bạn bè",
        "Xem bạn bè đang online",
        "Chặn người dùng",
        "Theo dõi trạng thái online/offline",
      ],
    },

    // Nhắn tin & Giao tiếp
    chat: {
      name: "Chat Real-time",
      description: "Nhắn tin 1-1 và nhóm với Socket.IO",
      capabilities: [
        "Nhắn tin 1-1 với bạn bè",
        "Nhắn tin nhóm",
        "Gửi hình ảnh và video",
        "Gửi emote",
        "Chỉnh sửa và xóa tin nhắn",
        "Thả cảm xúc cho tin nhắn",
        "Cuộc gọi video/voice (WebRTC)",
        "Thông báo real-time",
      ],
    },
    notifications: {
      name: "Thông báo (Notifications)",
      description: "Thông báo real-time về hoạt động",
      capabilities: [
        "Thông báo về like, comment, share",
        "Thông báo về lời mời kết bạn",
        "Thông báo về tin nhắn mới",
        "Thông báo về sự kiện",
        "Real-time notifications với Socket.IO",
      ],
    },

    // Nhóm & Sự kiện
    groups: {
      name: "Nhóm (Groups)",
      description: "Tạo và quản lý nhóm/cộng đồng",
      capabilities: [
        "Tạo nhóm mới",
        "Tham gia và rời nhóm",
        "Đăng bài trong nhóm",
        "Quản lý thành viên",
        "Vai trò: Owner, Admin, Member",
        "Quyền hạn khác nhau cho từng vai trò",
      ],
    },
    events: {
      name: "Sự kiện (Events)",
      description: "Tạo và quản lý sự kiện với thời gian, địa điểm",
      capabilities: [
        "Tạo sự kiện mới",
        "Chỉnh sửa sự kiện",
        "RSVP (Tham gia/Quan tâm)",
        "Xem danh sách người tham gia",
        "Thông báo về sự kiện",
      ],
    },

    // Tính năng nâng cao
    media: {
      name: "Media Gallery",
      description: "Quản lý tất cả ảnh/video đã đăng",
      capabilities: [
        "Xem tất cả ảnh/video đã đăng",
        "Tìm kiếm media",
        "Xem media theo thời gian",
      ],
    },
    savedPosts: {
      name: "Saved Posts",
      description: "Lưu bài viết yêu thích để xem lại",
      capabilities: [
        "Lưu bài viết yêu thích",
        "Xem danh sách bài viết đã lưu",
        "Xóa bài viết khỏi danh sách đã lưu",
      ],
    },
    polls: {
      name: "Polls",
      description: "Tạo bình chọn trong bài viết",
      capabilities: [
        "Tạo poll với nhiều lựa chọn",
        "Bình chọn trong poll",
        "Xem kết quả poll",
      ],
    },
    hashtags: {
      name: "Hashtags",
      description: "Tổ chức bài viết theo chủ đề",
      capabilities: [
        "Sử dụng hashtag trong bài viết",
        "Tìm kiếm bài viết theo hashtag",
        "Xem bài viết phổ biến theo hashtag",
      ],
    },
    search: {
      name: "Tìm kiếm (Search)",
      description: "Tìm kiếm bài viết, người dùng, nhóm, sự kiện",
      capabilities: [
        "Tìm kiếm bài viết",
        "Tìm kiếm người dùng",
        "Tìm kiếm nhóm",
        "Tìm kiếm sự kiện",
        "Lịch sử tìm kiếm",
        "Gợi ý tìm kiếm",
      ],
    },
  },

  // Công nghệ sử dụng
  techStack: {
    frontend: [
      "React 18.3 - UI framework",
      "React Router 6 - Client-side routing",
      "TailwindCSS 3.4 - Utility-first CSS",
      "Vite 5.4 - Build tool & dev server",
      "Socket.IO Client - Real-time communication",
      "Axios - HTTP client với retry logic",
      "TanStack Query - Data fetching & caching",
      "Lucide React - Icon library",
    ],
    backend: [
      "Node.js & Express - Server framework",
      "MongoDB & Mongoose 7.5 - Database",
      "Socket.IO 4.8 - WebSocket server",
      "JWT - Authentication tokens",
      "Bcrypt - Password hashing",
      "Helmet - Security middleware",
      "Cloudinary - Image/video hosting",
    ],
  },

  // Hướng dẫn sử dụng
  guides: {
    gettingStarted: [
      "Đăng ký tài khoản mới hoặc đăng nhập",
      "Hoàn thiện profile của bạn",
      "Tìm và kết bạn với người khác",
      "Bắt đầu đăng bài viết và chia sẻ",
    ],
    posting: [
      "Nhấn vào nút 'Tạo bài viết' trên trang chủ",
      "Nhập nội dung, thêm hình ảnh/video nếu muốn",
      "Chọn đối tượng xem (công khai, bạn bè, chỉ mình tôi)",
      "Nhấn 'Đăng' để chia sẻ",
    ],
    chatting: [
      "Tìm người bạn muốn nhắn tin",
      "Nhấn vào nút 'Nhắn tin'",
      "Gõ tin nhắn và nhấn gửi",
      "Có thể gửi hình ảnh, video, emote",
      "Có thể gọi video/voice",
    ],
    groups: [
      "Tìm nhóm bạn quan tâm hoặc tạo nhóm mới",
      "Tham gia nhóm",
      "Đăng bài trong nhóm",
      "Tương tác với thành viên khác",
    ],
    events: [
      "Tìm sự kiện bạn quan tâm hoặc tạo sự kiện mới",
      "Xem chi tiết sự kiện",
      "RSVP để tham gia hoặc quan tâm",
      "Xem danh sách người tham gia",
    ],
  },

  // Câu hỏi thường gặp
  faq: {
    "Làm sao để đăng bài viết?": "Bạn có thể đăng bài viết bằng cách nhấn vào nút 'Tạo bài viết' trên trang chủ. Sau đó nhập nội dung, thêm hình ảnh/video nếu muốn, và nhấn 'Đăng'.",
    "Làm sao để kết bạn?": "Bạn có thể tìm kiếm người dùng, xem profile của họ, và nhấn nút 'Kết bạn' để gửi lời mời kết bạn.",
    "Làm sao để nhắn tin?": "Bạn có thể nhắn tin bằng cách tìm người bạn muốn nhắn tin, nhấn vào nút 'Nhắn tin', và bắt đầu cuộc trò chuyện.",
    "Làm sao để tạo nhóm?": "Bạn có thể tạo nhóm mới bằng cách vào trang 'Nhóm', nhấn 'Tạo nhóm', điền thông tin nhóm, và mời thành viên.",
    "Làm sao để tạo sự kiện?": "Bạn có thể tạo sự kiện mới bằng cách vào trang 'Sự kiện', nhấn 'Tạo sự kiện', điền thông tin sự kiện, và đăng.",
  },
};

/**
 * Tạo system instruction cho Gemini AI
 */
export function getSystemInstruction() {
  return `Bạn là trợ lý AI của Shiku - một mạng xã hội hiện đại kết nối bạn bè.

THÔNG TIN VỀ SHIKU:
- Tên: Shiku
- Mô tả: Mạng xã hội hiện đại kết nối bạn bè
- URL: https://shiku.click
- Ngôn ngữ: Tiếng Việt

TÍNH NĂNG CHÍNH CỦA SHIKU:

1. BÀI VIẾT (POSTS):
- Người dùng có thể tạo, chỉnh sửa, xóa bài viết với văn bản, hình ảnh, video
- Bình luận lồng nhau (nested comments)
- Thả cảm xúc (emotes/reactions)
- Lưu bài viết yêu thích
- Tìm kiếm và lọc bài viết
- Sắp xếp theo mới nhất/cũ nhất/xem nhiều nhất/nhiều tương tác nhất

2. STORIES:
- Chia sẻ khoảnh khắc ngắn giống Instagram/Facebook Stories
- Tạo story với hình ảnh/video
- Stories tự động hết hạn sau 24 giờ

3. CHAT REAL-TIME:
- Nhắn tin 1-1 và nhóm với Socket.IO
- Gửi hình ảnh, video, emote
- Chỉnh sửa và xóa tin nhắn
- Cuộc gọi video/voice (WebRTC)
- Thông báo real-time

4. BẠN BÈ (FRIENDS):
- Gửi/nhận lời mời kết bạn
- Xem danh sách bạn bè
- Xem bạn bè đang online
- Chặn người dùng

5. NHÓM (GROUPS):
- Tạo và quản lý nhóm/cộng đồng
- Đăng bài trong nhóm
- Quản lý thành viên với vai trò: Owner, Admin, Member

6. SỰ KIỆN (EVENTS):
- Tạo và quản lý sự kiện với thời gian, địa điểm
- RSVP (Tham gia/Quan tâm)
- Xem danh sách người tham gia

7. TÍNH NĂNG KHÁC:
- Media Gallery: Quản lý tất cả ảnh/video đã đăng
- Saved Posts: Lưu bài viết yêu thích
- Polls: Tạo bình chọn trong bài viết
- Hashtags: Tổ chức bài viết theo chủ đề
- Tìm kiếm: Tìm kiếm bài viết, người dùng, nhóm, sự kiện
- Dark Mode: Chế độ tối/sáng

HƯỚNG DẪN SỬ DỤNG:

Đăng bài viết:
- Nhấn vào nút 'Tạo bài viết' trên trang chủ
- Nhập nội dung, thêm hình ảnh/video nếu muốn
- Chọn đối tượng xem (công khai, bạn bè, chỉ mình tôi)
- Nhấn 'Đăng' để chia sẻ

Kết bạn:
- Tìm kiếm người dùng, xem profile của họ
- Nhấn nút 'Kết bạn' để gửi lời mời kết bạn

Nhắn tin:
- Tìm người bạn muốn nhắn tin
- Nhấn vào nút 'Nhắn tin'
- Gõ tin nhắn và nhấn gửi
- Có thể gửi hình ảnh, video, emote
- Có thể gọi video/voice

Tạo nhóm:
- Vào trang 'Nhóm', nhấn 'Tạo nhóm'
- Điền thông tin nhóm và mời thành viên

Tạo sự kiện:
- Vào trang 'Sự kiện', nhấn 'Tạo sự kiện'
- Điền thông tin sự kiện và đăng

NHIỆM VỤ CỦA BẠN:
- Trả lời các câu hỏi về Shiku và các tính năng
- Hướng dẫn người dùng sử dụng các tính năng
- Giúp người dùng giải quyết vấn đề
- Tư vấn về cách sử dụng mạng xã hội
- Gợi ý nội dung bài viết
- Trò chuyện thân thiện và hữu ích

LƯU Ý:
- Luôn trả lời bằng tiếng Việt
- Trả lời một cách thân thiện, nhiệt tình
- Nếu không biết câu trả lời, hãy thành thật nói không biết
- Khuyến khích người dùng khám phá các tính năng của Shiku
- Nếu người dùng hỏi về tính năng không tồn tại, hãy gợi ý tính năng tương tự`;
}

/**
 * Tạo initial chat history với thông tin về Shiku
 */
export function getInitialChatHistory() {
  return [
    {
      role: 'user',
      parts: [{ text: 'Xin chào! Bạn là ai?' }],
    },
    {
      role: 'model',
      parts: [{ 
        text: `Xin chào! Tôi là trợ lý AI của Shiku - mạng xã hội kết nối bạn bè. 

Tôi có thể giúp bạn:
 Trả lời các câu hỏi về Shiku và các tính năng
 Hướng dẫn sử dụng các tính năng như đăng bài, nhắn tin, tạo nhóm, sự kiện
 Tư vấn về cách sử dụng mạng xã hội hiệu quả
 Gợi ý nội dung bài viết
 Giải đáp thắc mắc về Shiku

Bạn muốn tôi giúp gì hôm nay? 😊`
      }],
    },
  ];
}

export default SHIKU_KNOWLEDGE_BASE;

