import React from "react";

export default function Settings() {
  const [darkMode, setDarkMode] = React.useState(false);

  // lấy mặc định từ localStorage hoặc system preference
  React.useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) {
      setDarkMode(saved === "true");
      return;
    }
    const prefers = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    setDarkMode(!!prefers);
  }, []);

  // áp dụng & lưu
  React.useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  return (
    <div className={"min-h-screen pt-20 " + (darkMode ? "bg-gray-950" : "bg-gray-50")}>
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div
          className={
            "card mb-6 rounded-2xl p-6 shadow-sm border " +
            (darkMode ? "bg-gray-900/60 border-gray-800 text-white" : "bg-white border-gray-200")
          }
        >
          <h1 className="text-2xl font-bold">Cài đặt tài khoản</h1>
          <p className={"mt-1 text-sm " + (darkMode ? "text-gray-400" : "text-gray-500")}>
            Quản lý giao diện và các tùy chọn bảo mật cho tài khoản của bạn.
          </p>
        </div>

        {/* Content */}
        <div
          className={
            "card rounded-2xl p-0 overflow-hidden shadow-sm border " +
            (darkMode ? "bg-gray-900/60 border-gray-800 text-white" : "bg-white border-gray-200")
          }
        >
          {/* Section: Giao diện */}
          <SectionHeader title="Giao diện" subtitle="Tùy chọn màu sắc và chế độ hiển thị." darkMode={darkMode} />
          <div className="p-6 flex flex-col md:flex-row gap-6 items-start">
            <div className="md:w-1/2">
              <Label title="Giao diện" darkMode={darkMode} />
              <p className={"text-sm mt-1 " + (darkMode ? "text-gray-400" : "text-gray-500")}>Tính năng giao diện (dark mode, tuỳ chỉnh màu sắc) đang được cập nhật.</p>
            </div>
            <div className="md:w-1/2 flex justify-end">
              <div className={"text-xs text-right " + (darkMode ? "text-gray-400" : "text-gray-500")}>Ghi chú: Các tuỳ chọn giao diện sẽ sớm có mặt. Vui lòng quay lại sau!</div>
            </div>
          </div>

          <Divider darkMode={darkMode} />

          {/* Section: Mật khẩu */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="md:col-span-1">
                <Label title="Mật khẩu" darkMode={darkMode} />
                <p className={"text-sm mt-1 " + (darkMode ? "text-gray-400" : "text-gray-500")}>
                  Đổi mật khẩu trong phần <b>Trang cá nhân</b>.
                </p>
              </div>

              <div className="md:col-span-2">
                <a
                  href="/profile" // điều hướng tới trang cá nhân của bạn
                  className={
                    "inline-flex items-center rounded-lg px-4 py-2 text-sm border " +
                    (darkMode
                      ? "border-gray-700 hover:bg-gray-800"
                      : "border-gray-300 hover:bg-gray-50")
                  }
                >
                  Đi tới Trang cá nhân
                </a>
              </div>
            </div>
          </div>

          <Divider darkMode={darkMode} />

          {/* Danger Zone */}
          <div className={"p-6 bg-red-50 dark:bg-red-900/20"}>
            <h3 className={"text-base font-semibold " + (darkMode ? "text-red-300" : "text-red-700")}>
              Khu vực nguy hiểm
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-3 items-start">
              <div className="md:col-span-1">
                <Label title="Xóa tài khoản" darkMode={darkMode} />
                <p className={"text-sm mt-1 " + (darkMode ? "text-red-300/80" : "text-red-700/80")}>
                  Hành động không thể hoàn tác. Dữ liệu của bạn sẽ bị xóa vĩnh viễn.
                </p>
              </div>

              <div className="md:col-span-2">
                <button
                  className="btn-outline border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 px-4 py-2 rounded-lg"
                  onClick={() => {
                    if (confirm("Bạn chắc chắn muốn xóa tài khoản? Hành động không thể hoàn tác.")) {
                      // TODO: gọi API xóa tài khoản
                      // await api.delete('/me')
                      alert("Đã gửi yêu cầu xóa tài khoản.");
                    }
                  }}
                >
                  Xóa tài khoản
                </button>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, darkMode }) {
  return (
    <div className={"px-6 pt-6 pb-3 border-b " + (darkMode ? "border-gray-800" : "border-gray-100")}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {subtitle && (
        <p className={"text-sm mt-1 " + (darkMode ? "text-gray-400" : "text-gray-500")}>{subtitle}</p>
      )}
    </div>
  );
}

function Divider({ darkMode }) {
  return <div className={"h-px w-full " + (darkMode ? "bg-gray-800" : "bg-gray-100")} />;
}

function Label({ title, darkMode }) {
  return <div className={"text-sm font-medium " + (darkMode ? "text-gray-200" : "text-gray-800")}>{title}</div>;
}
