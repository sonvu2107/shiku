import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Move, RotateCw, Check, Loader2 } from 'lucide-react';

/**
 * AvatarCropper - Component để crop và điều chỉnh vị trí avatar
 * @param {File} imageFile - File ảnh được chọn
 * @param {Function} onCropComplete - Callback khi crop hoàn thành, nhận blob của ảnh đã crop
 * @param {Function} onCancel - Callback khi hủy
 * @returns {JSX.Element} Component AvatarCropper
 */
export default function AvatarCropper({ imageFile, onCropComplete, onCancel }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [scale, setScale] = useState(1); // Zoom scale
  const [position, setPosition] = useState({ x: 0, y: 0 }); // Position offset
  const [rotation, setRotation] = useState(0); // Rotation angle
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState(400); // Dynamic crop size
  const cropSize = 400; // Kích thước crop area (px) - output size

  // Update container size based on window size
  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setContainerSize(Math.min(300, width - 40));
      } else if (width < 768) {
        setContainerSize(350);
      } else {
        setContainerSize(400);
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Load image khi file thay đổi
  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target.result);
        // Reset về trạng thái mặc định
        // Scale = 1 nghĩa là ảnh hiển thị với kích thước container (đã được objectFit: cover)
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  // Get touch or mouse coordinates
  const getEventCoordinates = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  // Handle mouse/touch drag để di chuyển ảnh
  const handleStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const coords = getEventCoordinates(e);
    setDragStart({
      x: coords.x - position.x,
      y: coords.y - position.y
    });
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const coords = getEventCoordinates(e);
    const newX = coords.x - dragStart.x;
    const newY = coords.y - dragStart.y;
    
    // Giới hạn di chuyển trong một phạm vi hợp lý
    const maxOffset = containerSize * 2;
    setPosition({
      x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, newY))
    });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Handle zoom
  const handleZoom = (delta) => {
    setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  // Handle rotation
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Crop ảnh và tạo blob
  const handleCrop = async () => {
    if (!imageSrc || !canvasRef.current || !containerRef.current) return;

    setIsProcessing(true);
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageSrc;
      });

      // Set canvas size với high DPR để đảm bảo chất lượng
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Limit DPR để tránh canvas quá lớn
      const outputSize = cropSize;
      canvas.width = outputSize * dpr;
      canvas.height = outputSize * dpr;
      ctx.scale(dpr, dpr);

      // Clear canvas
      ctx.clearRect(0, 0, outputSize, outputSize);

      // Create circular clipping path
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.clip();

      // Fill với white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outputSize, outputSize);

      // Tính toán chính xác để khớp với preview
      // Preview: ảnh hiển thị trong container containerSize*2 với objectFit: cover
      // Crop area: containerSize x containerSize ở giữa preview container
      // objectFit: cover sẽ scale ảnh để fill preview container, giữ aspect ratio
      // Phần được hiển thị trong crop area là phần center của ảnh đã được scale
      
      const previewContainerSize = containerSize * 2;
      const cropAreaSize = containerSize; // Kích thước vùng crop
      const imgAspect = img.width / img.height;
      const containerAspect = 1; // Square container
      
      // Tính toán scale factor để ảnh fill preview container với objectFit: cover
      // objectFit: cover sẽ scale ảnh để fill container, crop phần thừa
      let coverScale;
      if (imgAspect > containerAspect) {
        // Ảnh rộng hơn: scale để fit height của preview container
        coverScale = previewContainerSize / img.height;
      } else {
        // Ảnh cao hơn hoặc bằng: scale để fit width của preview container
        coverScale = previewContainerSize / img.width;
      }
      
      // Kích thước ảnh sau khi scale để cover preview container
      const scaledImgWidth = img.width * coverScale;
      const scaledImgHeight = img.height * coverScale;
      
      // Tính toán chính xác phần ảnh được hiển thị trong crop area
      // 
      // Preview container: previewContainerSize x previewContainerSize (containerSize * 2)
      // Crop area: cropAreaSize x cropAreaSize (containerSize) ở center
      // 
      // Ảnh được hiển thị với objectFit: cover trong preview container
      // Sau đó được scale với user scale (scale)
      // 
      // Để tính phần ảnh gốc tương ứng với crop area:
      // 1. Tính phần ảnh gốc được hiển thị trong preview container (với coverScale)
      // 2. Tính phần ảnh trong crop area (center của preview container)
      // 3. Điều chỉnh theo user scale
      
      // Bước 1: Phần ảnh gốc được hiển thị trong preview container (khi scale = 1)
      // Với objectFit: cover, ảnh được scale để fill container, giữ aspect ratio
      // Phần được hiển thị là center của ảnh
      let sourcePreviewWidth, sourcePreviewHeight, sourcePreviewX, sourcePreviewY;
      
      if (imgAspect > containerAspect) {
        // Ảnh rộng hơn: scale để fit height
        // Chiều cao được hiển thị = toàn bộ img.height
        sourcePreviewHeight = img.height;
        // Chiều rộng được hiển thị = previewContainerSize (container là hình vuông)
        sourcePreviewWidth = previewContainerSize / coverScale;
        // Center crop theo width
        sourcePreviewX = (img.width - sourcePreviewWidth) / 2;
        sourcePreviewY = 0;
      } else {
        // Ảnh cao hơn hoặc bằng: scale để fit width
        // Chiều rộng được hiển thị = toàn bộ img.width
        sourcePreviewWidth = img.width;
        // Chiều cao được hiển thị = previewContainerSize
        sourcePreviewHeight = previewContainerSize / coverScale;
        // Center crop theo height
        sourcePreviewX = 0;
        sourcePreviewY = (img.height - sourcePreviewHeight) / 2;
      }
      
      // Bước 2: Crop area ở center của preview container
      // Crop area chiếm tỷ lệ: cropAreaSize / previewContainerSize = 0.5
      // Nhưng cần tính trong không gian ảnh đã scale với user scale
      
      // Khi user scale = 1: ảnh fill preview container
      // Khi user scale = 0.5: ảnh chỉ fill 50% preview container (nhỏ hơn)
      // Khi user scale = 2: ảnh lớn gấp đôi preview container (zoom in)
      
      // Trong preview, sau user scale:
      // - Ảnh có kích thước thực tế: previewContainerSize * scale
      // - Preview container vẫn: previewContainerSize x previewContainerSize
      // - Crop area vẫn: cropAreaSize x cropAreaSize ở center
      // 
      // Phần ảnh được hiển thị trong crop area phụ thuộc vào scale:
      // - scale = 1: crop area hiển thị 1/4 của ảnh (vì cropAreaSize = previewContainerSize / 2)
      // - scale = 0.5: crop area hiển thị 1/2 của ảnh (vì ảnh nhỏ hơn)
      // - scale = 2: crop area hiển thị 1/8 của ảnh (vì ảnh lớn hơn)
      
      // Tính phần ảnh gốc tương ứng với crop area
      // 
      // Trong preview:
      // - Preview container: previewContainerSize x previewContainerSize
      // - Ảnh được hiển thị với objectFit: cover, fill container
      // - User scale: ảnh được scale lên/xuống
      // - Crop area: cropAreaSize x cropAreaSize ở center
      //
      // Khi scale = 1: ảnh fill preview container
      //   - Crop area hiển thị phần center của ảnh
      //   - Tỷ lệ: cropAreaSize / previewContainerSize = 0.5
      //   - Vậy crop area hiển thị 0.5 x 0.5 = 0.25 (1/4) của ảnh trong preview container
      //
      // Khi scale = 0.5: ảnh chỉ fill 50% preview container
      //   - Ảnh có kích thước: previewContainerSize * 0.5
      //   - Crop area vẫn: cropAreaSize
      //   - Tỷ lệ: cropAreaSize / (previewContainerSize * 0.5) = 1.0
      //   - Vậy crop area hiển thị toàn bộ ảnh (vì ảnh nhỏ hơn crop area)
      //
      // Cách tính đúng:
      // 1. Ảnh trong preview container sau user scale có kích thước hiệu dụng: previewContainerSize * scale
      // 2. Crop area có kích thước: cropAreaSize
      // 3. Tỷ lệ phần ảnh trong crop area: cropAreaSize / (previewContainerSize * scale)
      // 4. Trong không gian ảnh gốc: phần này = sourcePreviewWidth * (cropAreaSize / (previewContainerSize * scale))
      
      const effectiveScale = scale;
      
      // Tỷ lệ crop area so với ảnh đã scale trong preview container
      // Khi scale = 1: cropAreaSize / previewContainerSize = 0.5 (crop area = 1/2 preview container)
      // Khi scale = 0.5: cropAreaSize / (previewContainerSize * 0.5) = 1.0 (crop area = toàn bộ ảnh)
      const cropToImageRatio = cropAreaSize / (previewContainerSize * effectiveScale);
      
      // Giới hạn tỷ lệ để không vượt quá 1.0 (không crop phần ngoài ảnh)
      const clampedRatio = Math.min(cropToImageRatio, 1.0);
      
      // Phần ảnh gốc tương ứng với crop area
      const adjustedSourceWidth = sourcePreviewWidth * clampedRatio;
      const adjustedSourceHeight = sourcePreviewHeight * clampedRatio;
      
      // Vị trí center của crop area trong ảnh gốc
      // Crop area luôn ở center của preview container
      const adjustedSourceX = sourcePreviewX + (sourcePreviewWidth - adjustedSourceWidth) / 2;
      const adjustedSourceY = sourcePreviewY + (sourcePreviewHeight - adjustedSourceHeight) / 2;
      
      // Áp dụng position offset (di chuyển ảnh)
      // Position là pixel offset trong preview container space
      // Cần convert sang ảnh gốc space
      // Tỷ lệ: 1 pixel preview = sourcePreviewWidth / previewContainerSize pixel ảnh gốc
      // Sau user scale, ảnh được scale, nên offset cũng cần scale
      const pixelToSourceRatio = sourcePreviewWidth / previewContainerSize;
      const positionOffsetX = (position.x * pixelToSourceRatio) / effectiveScale;
      const positionOffsetY = (position.y * pixelToSourceRatio) / effectiveScale;
      
      const finalSourceX = adjustedSourceX - positionOffsetX;
      const finalSourceY = adjustedSourceY - positionOffsetY;

      // Scale ratio từ crop area sang output canvas
      const scaleRatio = outputSize / cropAreaSize;
      
      // Kích thước ảnh trên output canvas
      // Crop area có kích thước cropAreaSize, scale lên outputSize
      const outputImageSize = cropAreaSize * scaleRatio;

      // Center của output canvas
      const centerX = outputSize / 2;
      const centerY = outputSize / 2;
      
      // Position offset từ preview space sang canvas space
      // Position là pixel offset trong preview container space
      // Cần scale sang output canvas space
      const offsetX = position.x * scaleRatio;
      const offsetY = position.y * scaleRatio;

      // Save context để apply transforms
      ctx.save();
      
      // Apply transforms theo thứ tự ngược với CSS để khớp với preview:
      // CSS transform: translate(position) scale(scale) rotate(rotation)
      // Thứ tự trong CSS (từ trái sang phải): translate -> scale -> rotate
      // Trong canvas, cần reverse: rotate -> scale -> translate
      
      // 1. Translate về center của canvas
      ctx.translate(centerX, centerY);
      
      // 2. Apply rotation (nếu có)
      if (rotation !== 0) {
        ctx.rotate((rotation * Math.PI) / 180);
      }
      
      // 3. Apply user scale (scale đã được tính vào outputImageSize, nhưng cần apply transform)
      // Thực ra outputImageSize đã bao gồm scale rồi, nhưng để đúng với CSS transform order,
      // chúng ta cần apply scale transform ở đây
      // Nhưng vì đã tính vào outputImageSize, chỉ cần translate
      
      // 4. Translate với position offset
      ctx.translate(offsetX, offsetY);
      
      // Vẽ ảnh từ center
      // Source: phần ảnh gốc tương ứng với crop area (đã điều chỉnh theo user scale)
      // Destination: vẽ với kích thước crop area scale lên output size
      const drawX = -outputImageSize / 2;
      const drawY = -outputImageSize / 2;
      
      ctx.drawImage(
        img,
        finalSourceX, finalSourceY, adjustedSourceWidth, adjustedSourceHeight, // Source: phần ảnh gốc tương ứng với crop area
        drawX, drawY, outputImageSize, outputImageSize // Destination: vẽ với kích thước output
      );
      
      // Restore context
      ctx.restore();

      // Convert canvas to blob với chất lượng tốt
      canvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob);
        } else {
          alert('Có lỗi xảy ra khi xử lý ảnh');
          setIsProcessing(false);
        }
      }, 'image/png', 0.95);
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('Có lỗi xảy ra khi xử lý ảnh: ' + error.message);
      setIsProcessing(false);
    }
  };

  if (!imageSrc) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-600 dark:text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Căn chỉnh avatar
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isProcessing}
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="p-4 md:p-6">
          <div
            ref={containerRef}
            className="relative mx-auto bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden"
            style={{
              width: containerSize,
              height: containerSize,
              maxWidth: '100%',
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              userSelect: 'none'
            }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          >
            {/* Image Preview */}
            <div
              className="absolute"
              style={{
                width: `${containerSize * 2}px`,
                height: `${containerSize * 2}px`,
                left: '50%',
                top: '50%',
                marginLeft: `-${containerSize}px`,
                marginTop: `-${containerSize}px`,
                transform: `
                  translate(${position.x}px, ${position.y}px)
                  scale(${scale})
                  rotate(${rotation}deg)
                `,
                transformOrigin: 'center center',
                willChange: 'transform',
                overflow: 'hidden'
              }}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Preview"
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center center',
                  display: 'block'
                }}
              />
            </div>

            {/* Crop Overlay - Circular mask với grid guide */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: 'inset 0 0 0 2px rgba(255, 255, 255, 0.9), inset 0 0 0 9999px rgba(0, 0, 0, 0.5)',
                borderRadius: '50%'
              }}
            />
            {/* Grid lines for better positioning */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(255, 255, 255, 0.3) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255, 255, 255, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '33.33% 33.33%',
                borderRadius: '50%',
                opacity: 0.5
              }}
            />
          </div>

          {/* Hidden canvas for cropping */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Controls */}
          <div className="mt-6 space-y-4">
            {/* Zoom Control */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
                Zoom:
              </label>
              <div className="flex-1 flex items-center gap-2">
                <button
                  onClick={() => handleZoom(-0.1)}
                  disabled={isProcessing}
                  className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 relative">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${((scale - 0.5) / 2.5) * 100}%` }}
                  />
                </div>
                <button
                  onClick={() => handleZoom(0.1)}
                  disabled={isProcessing}
                  className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                  {Math.round(scale * 100)}%
                </span>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Move className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Hướng dẫn:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Kéo để di chuyển ảnh</li>
                    <li>Sử dụng nút Zoom để phóng to/thu nhỏ</li>
                    <li>Xoay ảnh nếu cần</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={handleRotate}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCw className="w-4 h-4" />
            <span>Xoay</span>
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleCrop}
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-2 bg-black dark:bg-gray-800 hover:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Xác nhận</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

