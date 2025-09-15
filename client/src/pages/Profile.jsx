import { useEffect, useState } from "react";
import { api, uploadImage } from "../api";
import UserName from "../components/UserName";

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

  // ==================== EFFECTS ====================
  
  /**
   * Load thông tin user khi component mount
   */
  useEffect(() => { 
    load(); 
  }, []);

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
                await api("/api/auth/update-profile", {
                  method: "POST",
                  body: form
                });
                alert("Cập nhật thành công!");
                setEditing(false);
                load();
              } catch (err) {
                alert("Lỗi: " + err.message);
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
    </div>
  );
}
