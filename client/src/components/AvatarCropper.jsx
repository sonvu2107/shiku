import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Move, RotateCw, Check, Loader2 } from 'lucide-react';

/**
 * AvatarCropper - Component to crop and adjust avatar position
 * @param {File} imageFile - Selected image file
 * @param {Function} onCropComplete - Callback when cropping is complete, receives the cropped image blob
 * @param {Function} onCancel - Callback when canceling
 * @returns {JSX.Element} AvatarCropper component
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

  // Load image when file changes
  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target.result);
        // Reset to default state
        // Scale = 1 means the image is displayed at the container size (with objectFit: cover)
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

  // Handle mouse/touch drag to move the image
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

    // Limit movement within a reasonable range
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

  // Crop image and create blob
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

      // Set canvas size with high DPR to ensure quality
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Limit DPR to avoid too large canvas
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

      // Calculate exact match with preview
      // Preview: image displayed in container containerSize*2 with objectFit: cover
      // Crop area: containerSize x containerSize in the center of preview container
      // objectFit: cover will scale the image to fill the preview container, maintaining aspect ratio
      // The part displayed in the crop area is the center of the scaled image

      const previewContainerSize = containerSize * 2;
      const cropAreaSize = containerSize; // Crop area size
      const imgAspect = img.width / img.height;
      const containerAspect = 1; // Square container

      // Calculate scale factor to cover preview container with objectFit: cover
      // objectFit: cover will scale image to fill container, cropping excess
      let coverScale;
      if (imgAspect > containerAspect) {
        // Image is wider: scale to fit height of preview container
        coverScale = previewContainerSize / img.height;
      } else {
        // Image is taller or equal: scale to fit width of preview container
        coverScale = previewContainerSize / img.width;
      }

      // Scaled image size to cover preview container
      const scaledImgWidth = img.width * coverScale;
      const scaledImgHeight = img.height * coverScale;

      // Calculate exact part of the image displayed in the crop area
      // 
      // Preview container: previewContainerSize x previewContainerSize (containerSize * 2)
      // Crop area: cropAreaSize x cropAreaSize (containerSize) in the center
      // 
      // Image is displayed with objectFit: cover in preview container
      // Then scaled with user scale (scale)
      // 
      // To calculate the original image part corresponding to the crop area:
      // 1. Calculate the original image part displayed in the preview container (with coverScale)
      // 2. Calculate the image part in the crop area (center of preview container)
      // 3. Adjust according to user scale

      // Step 1: Original image part displayed in the preview container (when scale = 1)
      // With objectFit: cover, image is scaled to fill container, maintaining aspect ratio
      // The displayed part is the center of the image
      let sourcePreviewWidth, sourcePreviewHeight, sourcePreviewX, sourcePreviewY;

      if (imgAspect > containerAspect) {
        // Image is wider: scale to fit height
        // Displayed height = full img.height
        sourcePreviewHeight = img.height;
        // Displayed width = previewContainerSize (container is square)
        sourcePreviewWidth = previewContainerSize / coverScale;
        // Center crop by width
        sourcePreviewX = (img.width - sourcePreviewWidth) / 2;
        sourcePreviewY = 0;
      } else {
        // Image is taller or equal: scale to fit width
        // Displayed width = full img.width
        sourcePreviewWidth = img.width;
        // Displayed height = previewContainerSize
        sourcePreviewHeight = previewContainerSize / coverScale;
        // Center crop by  height
        sourcePreviewX = 0;
        sourcePreviewY = (img.height - sourcePreviewHeight) / 2;
      }

      // Step 2: Crop area in the center of the preview container
      // Crop area occupies the ratio: cropAreaSize / previewContainerSize = 0.5
      // But need to calculate in the image space scaled with user scale

      // When user scale = 1: image fills preview container
      // When user scale = 0.5: image only fills 50% preview container (smaller)
      // When user scale = 2: image is twice as large as preview container (zoom in)

      // In preview, after user scale:
      // - Image has actual size: previewContainerSize * scale
      // - Preview container is still: previewContainerSize x previewContainerSize
      // - Crop area is still: cropAreaSize x cropAreaSize in center
      //
      // The part of the image displayed in the crop area depends on the scale:
      // - scale = 1: crop area displays 1/4 of the image (because cropAreaSize = previewContainerSize / 2)
      // - scale = 0.5: crop area displays 1/2 of the image (because the image is smaller)
      // - scale = 2: crop area displays 1/8 of the image (because the image is larger)

      // Calculate the original image part corresponding to the crop area
      //
      // In preview:
      // - Preview container: previewContainerSize x previewContainerSize
      // - Image is displayed with objectFit: cover, fill container
      // - User scale: image is scaled up/down
      // - Crop area: cropAreaSize x cropAreaSize in the center
      //
      // When scale = 1: image fills preview container
      // - Crop area displays the center of the image
      // - Ratio: cropAreaSize / previewContainerSize = 0.5
      // - So crop area displays 0.5 x 0.5 = 0.25 (1/4) of the image in the preview container
      //
      // When scale = 0.5: image only fills 50% of preview container
      // - Image has size: previewContainerSize * 0.5
      // - Crop area still: cropAreaSize
      // - Ratio: cropAreaSize / (previewContainerSize * 0.5) = 1.0
      // - So crop area displays the entire image (because the image is smaller than crop area)
      //
      // Correct calculation:
      // 1. Image in preview container after user scale has effective size: previewContainerSize * scale
      // 2. Crop area has size: cropAreaSize
      // 3. Ratio of image part in crop area: cropAreaSize / (previewContainerSize * scale)
      // 4. In original image space: this part = sourcePreviewWidth * (cropAreaSize / (previewContainerSize * scale))

      const effectiveScale = scale;

      // Crop area ratio compared to scaled image in preview container
      // When scale = 1: cropAreaSize / previewContainerSize = 0.5 (crop area = 1/2 preview container)
      // When scale = 0.5: cropAreaSize / (previewContainerSize * 0.5) = 1.0 (crop area = entire image)
      const cropToImageRatio = cropAreaSize / (previewContainerSize * effectiveScale);

      // Clamp ratio to not exceed 1.0 (do not crop outside the image)
      const clampedRatio = Math.min(cropToImageRatio, 1.0);

      // Original image part corresponding to crop area
      const adjustedSourceWidth = sourcePreviewWidth * clampedRatio;
      const adjustedSourceHeight = sourcePreviewHeight * clampedRatio;

      // Center position of crop area in original image
      // Crop area is always at the center of preview container
      const adjustedSourceX = sourcePreviewX + (sourcePreviewWidth - adjustedSourceWidth) / 2;
      const adjustedSourceY = sourcePreviewY + (sourcePreviewHeight - adjustedSourceHeight) / 2;

      // Apply position offset (move image)
      // Position is pixel offset in preview container space
      // Need to convert to original image space
      // Ratio: 1 pixel in preview = sourcePreviewWidth / previewContainerSize pixels in original image
      // After user scale, image is scaled, so offset also needs to be scaled
      const pixelToSourceRatio = sourcePreviewWidth / previewContainerSize;
      const positionOffsetX = (position.x * pixelToSourceRatio) / effectiveScale;
      const positionOffsetY = (position.y * pixelToSourceRatio) / effectiveScale;

      const finalSourceX = adjustedSourceX - positionOffsetX;
      const finalSourceY = adjustedSourceY - positionOffsetY;

      // Scale ratio from crop area to output canvas
      const scaleRatio = outputSize / cropAreaSize;

      // Image size on output canvas
      // Crop area has size cropAreaSize, scaled up to outputSize
      const outputImageSize = cropAreaSize * scaleRatio;

      // Center of output canvas
      const centerX = outputSize / 2;
      const centerY = outputSize / 2;

      // Position offset from preview space to canvas space
      // Position is pixel offset in preview container space
      // Need to scale to output canvas space
      const offsetX = position.x * scaleRatio;
      const offsetY = position.y * scaleRatio;

      // Save context to apply transforms
      ctx.save();

      // Apply transforms in reverse order of CSS to match preview:
      // CSS transform: translate(position) scale(scale) rotate(rotation)
      // Order in CSS (left to right): translate -> scale -> rotate
      // In canvas, need to reverse: rotate -> scale -> translate

      // 1. Translate to center of canvas
      ctx.translate(centerX, centerY);

      // 2. Apply rotation (if any)
      if (rotation !== 0) {
        ctx.rotate((rotation * Math.PI) / 180);
      }

      // 3. Apply user scale (scale has been included in outputImageSize, but need to apply transform)
      // Actually outputImageSize already includes scale, but to match CSS transform order,
      // we need to apply scale transform here
      // But since it's already included in outputImageSize, only need to translate

      // 4. Translate with position offset
      ctx.translate(offsetX, offsetY);

      // Draw image from center
      // Source: part of the original image corresponding to the crop area (adjusted for user scale)
      // Destination: draw with size of crop area scaled up to output size
      const drawX = -outputImageSize / 2;
      const drawY = -outputImageSize / 2;

      ctx.drawImage(
        img,
        finalSourceX, finalSourceY, adjustedSourceWidth, adjustedSourceHeight, // Source: the original image part corresponding to the crop area
        drawX, drawY, outputImageSize, outputImageSize // Destination: draw with size of output
      );

      // Restore context
      ctx.restore();

      // Convert canvas to blob with quality
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
      <div data-profile-customization-modal className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-6">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-600 dark:text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div data-profile-customization-modal className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Căn chỉnh avatar
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            disabled={isProcessing}
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="p-4 md:p-6">
          <div
            ref={containerRef}
            className="relative mx-auto bg-gray-100 dark:bg-neutral-950 rounded-full overflow-hidden"
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

            {/* Crop Overlay - Circular mask with grid guide */}
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
                  className="p-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="flex-1 bg-gray-200 dark:bg-neutral-800 rounded-full h-2 relative">
                  <div
                    className="bg-black dark:bg-white dark:bg-black dark:bg-white h-2 rounded-full transition-all"
                    style={{ width: `${((scale - 0.5) / 2.5) * 100}%` }}
                  />
                </div>
                <button
                  onClick={() => handleZoom(0.1)}
                  disabled={isProcessing}
                  className="p-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
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
            <div className="bg-neutral-100 dark:bg-neutral-800 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Move className="w-4 h-4 text-black dark:text-white flex-shrink-0 mt-0.5" />
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
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950/50">
          <button
            onClick={handleRotate}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCw className="w-4 h-4" />
            <span>Xoay</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="px-6 py-2 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleCrop}
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-2 bg-black dark:bg-neutral-900 hover:bg-gray-800 dark:hover:bg-neutral-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

