import { useEffect, useState } from "react";
import { api, uploadImage } from "../api";
import UserName from "../components/UserName";
import PostCard from "../components/PostCard";
import PostCreator from "../components/PostCreator";

/**
 * Profile - Trang profile cá nhân của user
 * Cho phép xem và chỉnh sửa thông tin cá nhân, upload avatar
 * @returns {JSX.Element} Component profile page
 */
export default function Profile() {
  // ==================== STATE MANAGEMENT ====================
  
  const [user, setUser] = useState(null); // Thông tin user hiện tại
  const [editing, setEditing] = useState(false); // Trạng thái edit mode
  const [form, setForm] = useState({
    name: "", // Tên hiển thị
    email: "", // Email
    birthday: "", // Ngày sinh
    gender: "", // Giới tính
    hobbies: "", // Sở thích
    avatarUrl: "", // URL avatar
    password: "" // Mật khẩu mới (optional)
  });
  const [avatarUploading, setAvatarUploading] = useState(false); // Loading khi upload avatar
  
  // Posts states
  const [posts, setPosts] = useState([]); // Danh sách bài đăng cá nhân
  const [postsLoading, setPostsLoading] = useState(false); // Loading posts
  const [postsError, setPostsError] = useState(""); // Error khi load posts

  // ==================== EFFECTS ====================
  
  /**
   * Load thông tin user khi component mount
   */
  useEffect(() => { 
    load(); 
  }, []);

  /**
   * Load posts sau khi user đã được load
   */
  useEffect(() => {
    if (user) {
      loadPosts();
    }
  }, [user]);

  // ==================== API FUNCTIONS ====================
  
  /**
   * Load thông tin user hiện tại và populate form
   */
  async function load() {
    const res = await api("/api/auth/me");
    setUser(res.user);
    
    // Populate form với data từ server
    setForm({
      name: res.user.name || "",
      email: res.user.email || "",
      birthday: res.user.birthday || "",
      gender: res.user.gender || "",
      hobbies: res.user.hobbies || "",
      avatarUrl: res.user.avatarUrl || "",
      password: "" // Luôn reset password field
    });
  }

  /**
   * Load bài đăng cá nhân của user
   */
  async function loadPosts() {
    if (!user) return;
    
    setPostsLoading(true);
    setPostsError("");
    
    try {
      // Load cả public và private posts của user
      const [publicData, privateData] = await Promise.all([
        api(`/api/posts?author=${user._id}&status=published&limit=50`),
        api(`/api/posts?author=${user._id}&status=private&limit=50`)
      ]);
      
      // Merge và sort theo thời gian tạo
      const allPosts = [...privateData.items, ...publicData.items]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setPosts(allPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
      setPostsError('Không thể tải bài đăng. Vui lòng thử lại.');
    } finally {
      setPostsLoading(false);
    }
  }

  if (!user) return <div className="card">Đang tải...</div>;

  return (
    <div className="w-full px-6 py-6 pt-24">
      <div className="card space-y-4 max-w-2xl mx-auto">
        <div className="flex flex-col items-center gap-2">
          {/* Avatar */}
          <div className="relative">
            {form.avatarUrl ? (
              <img
                src={form.avatarUrl}
                alt="avatar"
                className="w-28 h-28 rounded-full object-cover border-2 border-gray-300 bg-gray-100"
                onError={e => {
                  e.target.onerror = null;
                  e.target.src =
                    "https://ui-avatars.com/api/?name=" +
                    encodeURIComponent(form.name) +
                    "&background=cccccc&color=222222&size=128";
                }}
              />
            ) : (
              <div className="w-28 h-28 rounded-full flex items-center justify-center border-2 border-gray-300 bg-gray-100 text-4xl font-bold text-gray-500 select-none">
                {form.name ? form.name.trim()[0].toUpperCase() : "?"}
              </div>
            )}

            {/* Nút đổi ảnh */}
            <label
              className={
                "absolute bottom-0 right-0 btn-outline px-2 py-1 text-xs cursor-pointer " +
                (!editing ? "opacity-50 pointer-events-none" : "")
              }
            >
              Đổi ảnh
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={!editing}
                onChange={async e => {
                  if (!editing) return;
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setAvatarUploading(true);
                  try {
                    const { url } = await uploadImage(file);
                    setForm(f => ({ ...f, avatarUrl: url }));
                  } catch (err) {
                    alert("Upload thất bại: " + err.message);
                  } finally {
                    setAvatarUploading(false);
                  }
                }}
              />
            </label>
          </div>

          {/* Tên + tick */}
          <div className="flex items-center gap-2 mt-2">
            <UserName user={user} className="text-xl font-bold" />
          </div>

          {avatarUploading && (
            <div className="text-sm text-gray-500">Đang tải ảnh...</div>
          )}

          {/* Thông tin khi không edit */}
          {!editing && (
            <div className="mt-2 w-full flex flex-col items-center">
              <div className="w-full max-w-xs flex flex-col gap-2">
                <div className="flex items-center">
                  <span className="w-28 text-gray-500">Email:</span>
                  <span className="flex-1 text-gray-700">{form.email}</span>
                </div>
                {form.birthday && (
                  <div className="flex items-center">
                    <span className="w-28 text-gray-500">Ngày sinh:</span>
                    <span className="flex-1 text-gray-700">
                      {form.birthday}
                    </span>
                  </div>
                )}
                {form.gender && (
                  <div className="flex items-center">
                    <span className="w-28 text-gray-500">Giới tính:</span>
                    <span className="flex-1 text-gray-700">
                      {form.gender === "male"
                        ? "Nam"
                        : form.gender === "female"
                        ? "Nữ"
                        : "Khác"}
                    </span>
                  </div>
                )}
                {form.hobbies && (
                  <div className="flex items-center">
                    <span className="w-28 text-gray-500">Sở thích:</span>
                    <span className="flex-1 text-gray-700">{form.hobbies}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setEditing(true)}
                >
                  Chỉnh sửa
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Form edit */}
        {editing && (
          <form
            className="space-y-3"
            onSubmit={async e => {
              e.preventDefault();
              try {
                // Filter out empty values to avoid validation issues
                const updateData = Object.fromEntries(
                  Object.entries(form).filter(([key, value]) => {
                    // Always include name and email
                    if (key === "name" || key === "email") return true;
                    
                    // Always include avatarUrl if it has a value (user uploaded new avatar)
                    if (key === "avatarUrl" && value !== "") return true;
                    
                    // Don't send password if it's empty or doesn't meet requirements
                    if (key === "password") {
                      if (value === "") return false; // Empty password
                      // Check if password meets requirements (8+ chars, upper, lower, digit, special)
                      const hasMinLength = value.length >= 8;
                      const hasLower = /[a-z]/.test(value);
                      const hasUpper = /[A-Z]/.test(value);
                      const hasDigit = /\d/.test(value);
                      const hasSpecial = /[@$!%*?&]/.test(value);
                      
                      if (!hasMinLength || !hasLower || !hasUpper || !hasDigit || !hasSpecial) {
                        console.warn("Password doesn't meet requirements, skipping password update");
                        alert("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&)");
                        return false;
                      }
                    }
                    
                    // Don't send birthday if it's empty or invalid format
                    if (key === "birthday") {
                      if (value === "") return false; // Empty birthday
                      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; // Invalid format
                      
                      // Check if year is reasonable (1900-2024)
                      const year = parseInt(value.split('-')[0]);
                      if (year < 1900 || year > 2024) {
                        console.warn("Birthday year is not reasonable, skipping birthday update");
                        alert("Năm sinh phải từ 1900 đến 2024");
                        return false;
                      }
                    }
                    
                    // Don't send other fields if they're empty
                    return value !== "";
                  })
                );
                
                console.log("Sending profile update data:", updateData);
                
                await api("/api/auth/update-profile", {
                  method: "PUT",
                  body: updateData
                });
                alert("Cập nhật thành công!");
                setEditing(false);
                load();
              } catch (err) {
                console.error("Profile update error:", err);
                alert("Lỗi: " + (err.message || err));
              }
            }}
          >
            <div>
              <label>Tên</label>
              <input
                value={form.name}
                onChange={e =>
                  setForm(f => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e =>
                  setForm(f => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div>
              <label>Mật khẩu mới</label>
              <input
                type="password"
                value={form.password}
                onChange={e =>
                  setForm(f => ({ ...f, password: e.target.value }))
                }
                placeholder="Để trống nếu không đổi"
              />
            </div>
            <div>
              <label>Ngày sinh</label>
              <input
                type="date"
                value={form.birthday}
                onChange={e =>
                  setForm(f => ({ ...f, birthday: e.target.value }))
                }
              />
            </div>
            <div>
              <label>Giới tính</label>
              <select
                value={form.gender}
                onChange={e =>
                  setForm(f => ({ ...f, gender: e.target.value }))
                }
              >
                <option value="">Chọn</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div>
              <label>Sở thích</label>
              <input
                value={form.hobbies}
                onChange={e =>
                  setForm(f => ({ ...f, hobbies: e.target.value }))
                }
                placeholder="VD: Đọc sách, Du lịch..."
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button type="submit" className="btn">
                Lưu thay đổi
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setEditing(false);
                  load();
                }}
              >
                Huỷ
              </button>
            </div>
          </form>
        )}

        <div className="text-sm text-gray-500 text-center">
          Vai trò: {user.role}
        </div>
      </div>

      {/* Posts Section */}
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Bài đăng của bạn</h2>
            <p className="text-sm text-gray-500 mt-1">
              {posts.length > 0 ? `${posts.length} bài đăng` : 'Chưa có bài đăng nào'}
            </p>
          </div>
          
          {/* Post Creator */}
          <div className="p-4">
            <PostCreator user={user} />
          </div>
        </div>

        {/* Posts List */}
        {postsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="animate-pulse">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/5"></div>
                  </div>
                  <div className="h-64 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        ) : postsError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-400 text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-medium text-red-900 mb-2">Có lỗi xảy ra</h3>
            <p className="text-red-600 mb-4">{postsError}</p>
            <button
              onClick={loadPosts}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-6">
            {posts.map((post) => (
              <div
                key={post._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden"
              >
                <PostCard post={post} onUpdate={loadPosts} />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-gray-400 text-2xl">📝</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có bài đăng nào</h3>
            <p className="text-gray-500">Hãy tạo bài đăng đầu tiên của bạn!</p>
          </div>
        )}
      </div>
    </div>
  );
}
