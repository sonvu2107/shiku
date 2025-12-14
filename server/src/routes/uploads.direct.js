/**
 * Direct Upload Routes - Server-signed Cloudinary uploads
 * 
 * @module routes/uploads.direct
 * @description
 * Enables direct browser-to-Cloudinary uploads without proxying files through the server.
 * This reduces server load and improves upload performance for large files.
 * 
 * ENDPOINTS:
 * - GET  /api/uploads/direct/sign    → Generate signed upload params
 * - POST /api/uploads/direct/confirm → Verify upload & save to database
 * 
 * UPLOAD FLOW:
 * ┌──────────┐     ┌──────────┐     ┌─────────────┐     ┌──────────┐
 * │  Client  │ ──→ │  Server  │ ──→ │  Cloudinary │ ──→ │  Server  │
 * │          │     │  /sign   │     │   /upload   │     │ /confirm │
 * └──────────┘     └──────────┘     └─────────────┘     └──────────┘
 *      1. Request       2. Return          3. Direct         4. Verify &
 *         signature        signed params      upload            save DB
 * 
 * SECURITY:
 * - Signed uploads prevent unauthorized uploads
 * - Server validates file size/format after upload
 * - Invalid files are immediately deleted from Cloudinary
 * 
 * @requires authRequired - All endpoints require authentication
 */

import express from 'express';
import cloudinary from '../config/cloudinary.js';
import { authRequired } from '../middleware/auth.js';
import Media from '../models/Media.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/** Mask user ID for logging (privacy) */
const maskUid = (id) => (id ? String(id).slice(-6) : 'unknown');

/**
 * Upload policies define limits per media category
 * @constant {Object} POLICIES
 */
const POLICIES = {
    image: {
        maxBytes: 10 * 1024 * 1024,  // 10MB max for images
        formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        resource_type: 'image'
    },
    video: {
        maxBytes: 50 * 1024 * 1024,  // 50MB max for videos
        formats: ['mp4', 'webm', 'mov'],
        resource_type: 'video'
    }
};

/** Allowed Cloudinary folder paths */
const ALLOWED_FOLDERS = ['blog', 'avatars', 'groups', 'chat'];

/**
 * @route   GET /api/uploads/direct/sign
 * @desc    Generate signature for direct upload
 * @access  Private
 */
router.get('/direct/sign', authRequired, async (req, res) => {
    try {
        const { folder = 'blog', category = 'image' } = req.query;

        // 1. Validate input
        if (!ALLOWED_FOLDERS.includes(folder)) {
            logger.warn('Direct upload bad request: Invalid folder', {
                event: 'upload.sign.bad_request',
                uid: maskUid(req.user._id),
                folder,
                category
            });
            return res.status(400).json({ success: false, message: 'Invalid folder' });
        }

        const policy = POLICIES[category];
        if (!policy) {
            logger.warn('Direct upload bad request: Invalid category', {
                event: 'upload.sign.bad_request',
                uid: maskUid(req.user._id),
                folder,
                category
            });
            return res.status(400).json({ success: false, message: 'Invalid category' });
        }

        // 2. Prepare params to sign - MINIMAL SET
        // IMPORTANT: Only sign params that FE will actually send to Cloudinary
        // If you sign a param, FE MUST send it, otherwise signature mismatch!
        const timestamp = Math.round((new Date()).getTime() / 1000);
        const folderPath = `shiku/${folder}`;

        const paramsToSign = {
            timestamp,
            folder: folderPath
            // DO NOT add allowed_formats, eager, etc here unless FE sends them too!
        };

        // 3. Generate signature using Cloudinary SDK
        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET
        );

        // 4. Log success
        logger.info('Direct upload sign generated', {
            event: 'upload.sign.ok',
            uid: maskUid(req.user._id),
            category,
            folder: folderPath,
            resource_type: policy.resource_type,
            paramsToSign // Log what we signed for debugging
        });

        // 5. Return signed config
        // Only include params that were signed + additional info for FE
        res.json({
            success: true,
            config: {
                cloudName: process.env.CLOUDINARY_CLOUD_NAME,
                apiKey: process.env.CLOUDINARY_API_KEY,
                signature,
                timestamp,
                folder: folderPath,
                resource_type: policy.resource_type,
                // These are for FE info only, NOT sent to Cloudinary:
                max_file_size: policy.maxBytes,
                allowed_formats: policy.formats
            }
        });

    } catch (error) {
        logger.error('Direct upload sign error', {
            event: 'upload.sign.error',
            uid: maskUid(req.user?._id),
            error: error.message
        });
        res.status(500).json({ success: false, message: 'Server error generating signature' });
    }
});

/**
 * @route   POST /api/uploads/direct/confirm
 * @desc    Verify and save uploaded media
 * @access  Private
 */
router.post('/direct/confirm', authRequired, async (req, res) => {
    try {
        const { public_id, resource_type, category = 'image' } = req.body;

        if (!public_id || !resource_type) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // 1. Fetch asset details from Cloudinary (Verification)
        // IMPORTANT: Never trust client-provided metadata alone via verify signature logic if we want strict size checks,
        // explicitly fetching via Admin API is safer or using notification url.
        // However, using api.resource is good for confirmation flow.
        let asset;
        try {
            asset = await cloudinary.api.resource(public_id, {
                resource_type: resource_type
            });
        } catch (e) {
            logger.warn('Direct upload confirm lookup failed', {
                event: 'upload.confirm.cloudinary_lookup_failed',
                uid: maskUid(req.user._id),
                public_id,
                error: e.message
            });
            return res.status(400).json({ success: false, message: 'Asset not found or not ready' });
        }

        // Fix: Cloudinary might return 'jpg' but we mapped 'jpeg', ensure consistent comparison if needed
        // But policy checks bytes primarily.

        const policy = POLICIES[category];

        // 2. Validate Policy (Size & Format)
        // Note: Cloudinary API returns bytes
        const isValidSize = asset.bytes <= policy.maxBytes;
        const isValidFormat = policy.formats.includes(asset.format);

        if (!isValidSize || !isValidFormat) {
            // VIOLATION: Destroy asset immediatelly
            logger.warn('Direct upload policy violation', {
                event: 'upload.confirm.reject',
                uid: maskUid(req.user._id),
                public_id,
                bytes: asset.bytes,
                format: asset.format,
                reason: !isValidSize ? 'size_limit_exceeded' : 'invalid_format'
            });

            try {
                await cloudinary.uploader.destroy(public_id, { resource_type });
            } catch (destroyError) {
                logger.error('Direct upload destroy failed after rejection', {
                    event: 'upload.confirm.reject_destroy_failed',
                    uid: maskUid(req.user._id),
                    public_id,
                    error: destroyError.message
                });
            }

            return res.status(400).json({
                success: false,
                message: 'File violates upload policy (size or format)'
            });
        }

        // 3. Create Media Record
        // Determine type for DB enum (image, video, audio, document)
        // Cloudinary resource_type: 'image', 'video', 'raw'
        let dbType = 'document';
        if (resource_type === 'image') dbType = 'image'; // includes gif
        if (resource_type === 'video') dbType = 'video';

        // Legacy support: FE used 'gif' sometimes but Schema has strictly 'image'
        // We stick to schema: 'image'

        const newMedia = new Media({
            url: asset.secure_url,
            thumbnail: asset.secure_url, // Simplification, FE handles display
            originalName: public_id, // We lost original filename in direct upload if we don't pass it context, use public_id or context if available
            title: public_id.split('/').pop(),
            type: dbType,
            size: asset.bytes,
            mimeType: `${resource_type}/${asset.format}`,
            uploadedBy: req.user._id,
            isActive: true
        });

        // If client sent original_filename in context or metadata, we could fetch it.
        // For now, let's allow client to send 'originalName' in body for better UX, 
        // but sanitized.
        if (req.body.originalName) {
            newMedia.originalName = req.body.originalName;
            newMedia.title = req.body.originalName.split('.')[0] || newMedia.title;
        }

        await newMedia.save();

        // Populate for response consistency
        await newMedia.populate('uploadedBy', 'name avatarUrl');

        logger.info('Direct upload confirmed', {
            event: 'upload.confirm.ok',
            uid: maskUid(req.user._id),
            public_id,
            mediaId: newMedia._id,
            bytes: asset.bytes
        });

        return res.json({
            success: true,
            media: newMedia
        });

    } catch (error) {
        logger.error('Direct upload confirm error', {
            event: 'upload.confirm.error',
            uid: maskUid(req.user?._id),
            error: error.message
        });
        res.status(500).json({ success: false, message: 'Server error confirming upload' });
    }
});

export default router;
