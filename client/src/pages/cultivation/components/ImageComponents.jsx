/**
 * Image Components for Cultivation Items
 */
import { memo } from 'react';

// Component để hiển thị hình ảnh công pháp
export const TechniqueImage = memo(function TechniqueImage({ size = 20, className = '' }) {
  return (
    <img 
      src="/assets/congphap.jpg" 
      alt="Công pháp" 
      className={className}
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain'
      }}
    />
  );
});

// Component để hiển thị hình ảnh danh hiệu
export const TitleImage = memo(function TitleImage({ size = 20, className = '' }) {
  return (
    <img 
      src="/assets/danhhieu.jpg" 
      alt="Danh hiệu" 
      className={className}
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain'
      }}
    />
  );
});

// Component để hiển thị hình ảnh đan dược
export const ExpBoostImage = memo(function ExpBoostImage({ size = 20, className = '' }) {
  return (
    <img 
      src="/assets/danduoc.jpg" 
      alt="Đan dược" 
      className={className}
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain'
      }}
    />
  );
});

// Component để hiển thị hình ảnh hiệu ứng
export const ProfileEffectImage = memo(function ProfileEffectImage({ size = 20, className = '' }) {
  return (
    <img 
      src="/assets/hieuung.jpg" 
      alt="Hiệu ứng" 
      className={className}
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain'
      }}
    />
  );
});

// Component để hiển thị hình ảnh khung avatar
export const AvatarFrameImage = memo(function AvatarFrameImage({ size = 20, className = '' }) {
  return (
    <img 
      src="/assets/khungavatar.jpg" 
      alt="Khung avatar" 
      className={className}
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain'
      }}
    />
  );
});

// Component để hiển thị hình ảnh linh thú
export const PetImage = memo(function PetImage({ size = 20, className = '' }) {
  return (
    <img 
      src="/assets/linhthu.jpg" 
      alt="Linh thú" 
      className={className}
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain'
      }}
    />
  );
});

// Component để hiển thị hình ảnh tọa kỵ
export const MountImage = memo(function MountImage({ size = 20, className = '' }) {
  return (
    <img 
      src="/assets/toaky.jpg" 
      alt="Tọa kỵ" 
      className={className}
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain'
      }}
    />
  );
});

// Component để hiển thị hình ảnh vật phẩm tiêu hao
export const ConsumableImage = memo(function ConsumableImage({ size = 20, className = '' }) {
  return (
    <img 
      src="/assets/vatpham.jpg" 
      alt="Vật phẩm" 
      className={className}
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain'
      }}
    />
  );
});

// Component để hiển thị hình ảnh huy hiệu
export const BadgeImage = memo(function BadgeImage({ size = 20, className = '' }) {
  return (
    <img 
      src="/assets/huyhieu.jpg" 
      alt="Huy hiệu" 
      className={className}
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain'
      }}
    />
  );
});

