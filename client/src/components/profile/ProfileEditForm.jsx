import { motion, AnimatePresence } from "framer-motion";
import { Edit3 } from "lucide-react";
import { SpotlightCard } from "../ui/SpotlightCard";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { GENDER_OPTIONS, VALIDATION_RULES } from "../../constants/profile";
import { useToast } from "../../contexts/ToastContext";

/**
 * ProfileEditForm - Profile information editing form with SpotlightCard style
 */
export default function ProfileEditForm({
  editing,
  form,
  setForm,
  onSubmit,
  loading = false,
}) {
  const { showError } = useToast();
  
  if (!editing) return null;

  const validateForm = (data) => {
    // Validate password
    if (data.password && data.password !== "") {
      const { PASSWORD } = VALIDATION_RULES;
      const hasMinLength = data.password.length >= PASSWORD.minLength;
      const hasLower = /[a-z]/.test(data.password);
      const hasUpper = /[A-Z]/.test(data.password);
      const hasDigit = /\d/.test(data.password);
      const hasSpecial = PASSWORD.specialChars.test(data.password);
      
      if (!hasMinLength || !hasLower || !hasUpper || !hasDigit || !hasSpecial) {
        showError("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&)");
        return false;
      }
    }
    
    // Validate birthday
    if (data.birthday && data.birthday !== "") {
      if (!VALIDATION_RULES.BIRTHDAY.test(data.birthday)) {
        showError("Định dạng ngày sinh không hợp lệ (YYYY-MM-DD)");
        return false;
      }
      const year = parseInt(data.birthday.split('-')[0]);
      if (year < VALIDATION_RULES.BIRTHDAY_YEAR_MIN || year > new Date().getFullYear()) {
        showError("Năm sinh không hợp lệ");
        return false;
      }
    }
    
    // Validate phone
    if (data.phone && data.phone !== "") {
      if (!VALIDATION_RULES.PHONE.test(data.phone)) {
        showError("Số điện thoại không hợp lệ");
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Preprocess website field
    const updateData = { ...form };
    if (updateData.website && updateData.website !== "" && !updateData.website.startsWith('http://') && !updateData.website.startsWith('https://')) {
      updateData.website = `https://${updateData.website}`;
    }

    // Validate
    if (!validateForm(updateData)) {
      return;
    }

    // Filter out empty fields except name and email
    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(([key, value]) => {
        if (key === "name" || key === "email") return true;
        if ((key === "avatarUrl" || key === "coverUrl") && value !== "") return true;
        if (key === "password" && value === "") return false;
        return value !== "";
      })
    );

    await onSubmit(filteredData);
  };

  return (
    <AnimatePresence>
      {editing && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden mb-10"
        >
          <SpotlightCard className="p-6 md:p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Edit3 size={20}/> Cập nhật thông tin
            </h3>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <Input
                  label="Tên hiển thị"
                  value={form.name}
                  onChange={e => setForm(f => ({...f, name: e.target.value}))}
                />
                <Input
                  label="Biệt danh"
                  value={form.nickname || ""}
                  onChange={e => setForm(f => ({...f, nickname: e.target.value}))}
                  placeholder="Nhập biệt danh của bạn..."
                  maxLength={30}
                />
                <Textarea
                  label="Tiểu sử (Bio)"
                  rows={3}
                  value={form.bio || ""}
                  onChange={e => setForm(f => ({...f, bio: e.target.value}))}
                />
                <Input
                  label="Ngày sinh"
                  type="date"
                  value={form.birthday || ""}
                  onChange={e => setForm(f => ({...f, birthday: e.target.value}))}
                />
                <Select
                  label="Giới tính"
                  value={form.gender || ""}
                  onChange={e => setForm(f => ({...f, gender: e.target.value}))}
                >
                  {GENDER_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-4">
                <Input
                  label="Sở thích"
                  value={form.hobbies || ""}
                  onChange={e => setForm(f => ({...f, hobbies: e.target.value}))}
                  placeholder="VD: Đọc sách, Du lịch..."
                />
                <Input
                  label="Số điện thoại"
                  value={form.phone || ""}
                  onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                  placeholder="+84 123 456 789"
                />
                <Input
                  label="Địa chỉ"
                  value={form.location || ""}
                  onChange={e => setForm(f => ({...f, location: e.target.value}))}
                />
                <Input
                  label="Website"
                  value={form.website || ""}
                  onChange={e => setForm(f => ({...f, website: e.target.value}))}
                />
                <Input
                  label="Mật khẩu mới"
                  type="password"
                  value={form.password || ""}
                  onChange={e => setForm(f => ({...f, password: e.target.value}))}
                  placeholder="Để trống nếu không đổi"
                />
                <Button 
                  type="submit" 
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={loading}
                >
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </SpotlightCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

