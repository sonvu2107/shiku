/**
 * NotificationForm - Reusable notification form component
 * @param {Object} props - Component props
 * @param {string} props.type - Type of notification ('system' or 'admin')
 * @param {Object} props.form - Form state object
 * @param {Function} props.setForm - Form state setter
 * @param {Function} props.onSubmit - Submit handler
 * @param {boolean} props.disabled - Disable state
 * @returns {JSX.Element}
 */
export default function NotificationForm({ type, form, setForm, onSubmit, disabled = false }) {
  const isSystem = type === 'system';
  const bgColor = isSystem ? 'bg-blue-50' : 'bg-green-50';
  const textColor = isSystem ? 'text-blue-800' : 'text-green-800';
  const buttonColor = isSystem ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700';
  const title = isSystem ? 'Thông báo hệ thống' : 'Thông báo từ Admin';
  const buttonText = isSystem ? 'Gửi thông báo hệ thống' : 'Gửi thông báo';

  return (
    <div className={`${bgColor} p-4 rounded-lg`}>
      <h3 className={`font-semibold mb-3 ${textColor}`}>{title}</h3>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Tiêu đề thông báo..."
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="input w-full"
        />

        <textarea
          placeholder="Nội dung thông báo..."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="input w-full h-20 resize-none"
        />

        {isSystem && (
          <select
            value={form.targetRole}
            onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
            className="input w-full"
          >
            <option value="">Tất cả người dùng</option>
            <option value="admin">Chỉ Admin</option>
            <option value="user">Chỉ User thường</option>
          </select>
        )}

        <button
          onClick={onSubmit}
          className={`btn ${buttonColor} text-white w-full flex items-center justify-center`}
          disabled={disabled || !form.title.trim() || !form.message.trim()}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
