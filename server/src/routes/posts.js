/**
 * Posts Routes
 * 
 * Routes xử lý các thao tác liên quan đến bài viết (posts):
 * - Tạo, sửa, xóa bài viết
 * - Lấy danh sách bài viết (feed, my-posts, search)
 * - Like, unlike bài viết
 * - Smart feed algorithm
 * 
 * @module posts
 */

import express from "express";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";
import { authRequired, authOptional } from "../middleware/auth.js";
import { checkBanStatus } from "../middleware/banCheck.js";
import { paginate } from "../utils/paginate.js";
import { withCache, postCache, invalidateCache } from "../utils/cache.js";
import { responseCache, invalidateByPattern } from "../middleware/responseCache.js";
import { generateSmartFeed } from "../utils/smartFeed.js";
import mongoose from "mongoose";
import { addExpForAction, addExpForReceiver } from "../services/cultivationService.js";
import WelcomeService from "../services/WelcomeService.js";
import { sanitizeText, containsXSS, sanitizeUrl as sanitizeUrlXSS } from "../utils/xssSanitizer.js";
import { postCreationLimiter, postInteractionLimiter } from "../middleware/rateLimit.js";

const PLAIN_SANITIZE_OPTIONS = { allowedTags: [], allowedAttributes: {} };
const CONTENT_SANITIZE_OPTIONS = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a"
  ],
  allowedAttributes: {
    a: ["href", "title"],
    h1: ["id"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    h5: ["id"],
    h6: ["id"]
  }
};

const sanitizePlain = (value = "") =>
  sanitizeHtml(String(value).trim(), PLAIN_SANITIZE_OPTIONS);

const sanitizeRichContent = (value = "") =>
  sanitizeHtml(String(value).trim(), CONTENT_SANITIZE_OPTIONS);

const normalizeTags = (tagsInput) => {
  if (!Array.isArray(tagsInput)) return [];
  const maxTags = 10;
  return tagsInput
    .filter((tag) => typeof tag === "string")
    .map((tag) => sanitizePlain(tag).slice(0, 20).trim())
    .filter((tag) => tag.length > 0)
    .slice(0, maxTags);
};

export const sanitizePostFields = ({
  title,
  content,
  tags,
  coverUrl
} = {}) => {
  const sanitized = {};
  const errors = [];

  if (title !== undefined) {
    // Check for XSS in title
    if (containsXSS(title)) {
      errors.push('Tiêu đề chứa nội dung không hợp lệ');
    } else {
      sanitized.title = sanitizeText(title, { maxLength: 500 });
    }
  }

  if (content !== undefined) {
    // Check for XSS in content
    if (containsXSS(content)) {
      errors.push('Nội dung chứa mã độc hại');
    } else {
      // For content, use existing sanitizeRichContent but also apply XSS check
      sanitized.content = sanitizeRichContent(content);
    }
  }

  if (tags !== undefined) {
    sanitized.tags = normalizeTags(tags);
  }

  if (coverUrl !== undefined) {
    const safeUrl = sanitizeUrlXSS(coverUrl);
    sanitized.coverUrl = safeUrl || '';
  }

  // Return errors if any XSS detected
  if (errors.length > 0) {
    return { error: errors.join(', '), sanitized: null };
  }

  return { error: null, sanitized };
};

const router = express.Router();

// Get current user's posts only (both published and private) - Optimized with caching
router.get("/my-posts", authRequired, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const sanitizedLimit = Math.min(parseInt(limit) || 20, 500); // Increased max limit to 500
    const userId = req.user._id.toString();
    const statusFilter = status || "all";

    const cacheKey = `my-posts:${userId}:${page}:${sanitizedLimit}:${statusFilter}`;

    const result = await withCache(postCache, cacheKey, async () => {
      const filter = {
        author: req.user._id,
        status: status || { $in: ["published", "private"] },
        $and: [
          {
            $or: [
              { group: { $exists: false } },
              { group: null }
            ]
          }
        ]
      };

      // Use aggregation for better performance
      const [posts, total] = await Promise.all([
        Post.aggregate([
          { $match: filter },
          { $sort: { createdAt: -1 } },
          { $skip: (page - 1) * sanitizedLimit },
          { $limit: sanitizedLimit },
          {
            $lookup: {
              from: "users",
              localField: "author",
              foreignField: "_id",
              as: "author",
              pipeline: [{ $project: { name: 1, nickname: 1, avatarUrl: 1, role: 1, displayBadgeType: 1, cultivationCache: 1 } }]
            }
          },
          {
            $lookup: {
              from: "groups",
              localField: "group",
              foreignField: "_id",
              as: "group",
              pipeline: [{ $project: { name: 1 } }]
            }
          },
          // Populate emotes.user
          {
            $unwind: {
              path: "$emotes",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: "users",
              localField: "emotes.user",
              foreignField: "_id",
              as: "emotes.user",
              pipeline: [{ $project: { name: 1, nickname: 1, avatarUrl: 1, role: 1, displayBadgeType: 1, cultivationCache: 1 } }]
            }
          },
          {
            $addFields: {
              "emotes.user": { $arrayElemAt: ["$emotes.user", 0] }
            }
          },
          {
            $group: {
              _id: "$_id",
              author: { $first: "$author" },
              group: { $first: "$group" },
              title: { $first: "$title" },
              slug: { $first: "$slug" },
              content: { $first: "$content" },
              tags: { $first: "$tags" },
              status: { $first: "$status" },
              views: { $first: "$views" },
              coverUrl: { $first: "$coverUrl" },
              files: { $first: "$files" },
              createdAt: { $first: "$createdAt" },
              isEdited: { $first: "$isEdited" },
              hasPoll: { $first: "$hasPoll" },
              youtubeUrl: { $first: "$youtubeUrl" },
              emotes: {
                $push: {
                  $cond: [
                    { $ne: ["$emotes", null] },
                    "$emotes",
                    "$$REMOVE"
                  ]
                }
              }
            }
          },
          {
            $addFields: {
              author: { $arrayElemAt: ["$author", 0] },
              group: { $arrayElemAt: ["$group", 0] }
            }
          }
        ]),
        Post.countDocuments(filter)
      ]);

      return {
        posts,
        pagination: {
          page: parseInt(page),
          limit: sanitizedLimit,
          total,
          pages: Math.ceil(total / sanitizedLimit)
        }
      };
    }, 5 * 60 * 1000); // 5 minutes cache

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get posts by specific user ID (public posts only)
router.get("/user-posts", authOptional, async (req, res, next) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;
    const sanitizedLimit = Math.min(parseInt(limit) || 20, 500); // Increased max limit to 500

    if (!userId || userId === "undefined") {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "User ID không hợp lệ" });
    }

    // Check if user is blocked
    if (req.user) {
      const currentUser = await User.findById(req.user._id).select("blockedUsers").lean();
      const blockedIds = (currentUser.blockedUsers || []).map(id => id.toString());

      // If current user blocked this user, return empty result
      if (blockedIds.includes(userId)) {
        return res.json({
          posts: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      }
    }

    const filter = {
      author: userId,
      status: "published" // Only public posts
    };

    // Exclude group posts from user profile
    filter.$and = [
      {
        $or: [
          { group: { $exists: false } },
          { group: null }
        ]
      }
    ];

    const posts = await Post.find(filter)
      .populate("author", "name nickname avatarUrl role displayBadgeType cultivationCache")
      .populate("group", "name")
      .populate({
        path: "emotes.user",
        select: "name nickname avatarUrl role displayBadgeType cultivationCache"
      })
      .sort({ createdAt: -1 })
      .limit(sanitizedLimit)
      .skip((page - 1) * sanitizedLimit)
      .lean(); // Use lean() for better performance

    const total = await Post.countDocuments(filter);

    res.json({
      posts: posts,
      pagination: {
        page: parseInt(page),
        limit: sanitizedLimit,
        total,
        pages: Math.ceil(total / sanitizedLimit)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Smart Feed Endpoint - AI-powered personalized feed
 * Uses engagement scoring, friend posts, trending, personalized, and fresh content
 * Algorithm: 40% friends + 30% trending + 20% personalized + 10% fresh
 */
router.get("/feed/smart", authOptional, async (req, res, next) => {
  try {
    // Prevent browser caching để shuffle có tác dụng mỗi lần F5
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const { page = 1, limit = 20 } = req.query;
    const sanitizedLimit = Math.min(parseInt(limit) || 20, 500); // Increased max limit to 500
    const userId = req.user?._id?.toString() || null;
    const pg = Number(page) || 1;

    // Generate smart feed with pagination support
    const smartFeedPosts = await generateSmartFeed(userId, sanitizedLimit, pg);

    // Use denormalized counts directly
    const itemsWithCommentCount = smartFeedPosts.map(post => ({
      ...post,
      commentCount: post.commentCount || 0,
      savedCount: post.savedCount || 0
    }));

    // Filter blocked users if logged in
    // Filter blocked users (mutual blocking with batch fetch)
    let filteredItems = itemsWithCommentCount;
    if (req.user?._id && itemsWithCommentCount.length > 0) {
      const currentUser = await User.findById(req.user._id).select("blockedUsers").lean();
      const currentUserId = req.user._id.toString();
      const blockedSet = new Set((currentUser.blockedUsers || []).map(id => id.toString()));

      // Batch fetch all authors' blocked lists
      const authorIds = [...new Set(
        itemsWithCommentCount
          .map(post => post.author?._id?.toString())
          .filter(Boolean)
      )];

      const authorsWithBlocked = await User.find({
        _id: { $in: authorIds }
      })
        .select("_id blockedUsers")
        .lean();

      // Create a Map for O(1) lookup
      const authorsBlockedMap = new Map();
      authorsWithBlocked.forEach(author => {
        const authorId = author._id.toString();
        authorsBlockedMap.set(
          authorId,
          new Set((author.blockedUsers || []).map(id => id.toString()))
        );
      });

      // Filter posts: remove if either user blocked the other
      filteredItems = itemsWithCommentCount.filter(post => {
        const author = post.author;
        if (!author) return false;
        const authorId = author._id.toString();

        // Check if current user blocked this author
        if (blockedSet.has(authorId)) {
          return false;
        }

        // Check if author blocked current user (mutual blocking)
        const authorBlockedSet = authorsBlockedMap.get(authorId);
        if (authorBlockedSet && authorBlockedSet.has(currentUserId)) {
          return false;
        }

        return true;
      });
    }

    res.json({
      items: filteredItems,
      total: filteredItems.length,
      page: pg,
      algorithm: "smart-feed-v1",
      mix: {
        description: "40% friends, 30% trending, 20% personalized, 10% fresh",
        isPersonalized: !!userId
      }
    });
  } catch (error) {
    console.error("[ERROR][POSTS] Smart feed error:", error);
    // Fallback to regular feed if smart feed fails
    next(error);
  }
});

// Combined feed endpoint - Optimized single query for published + private
router.get("/feed", authOptional, responseCache({ ttlSeconds: 30, prefix: "feed" }), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, tag, q, sort = "newest" } = req.query;
    const pg = Math.max(1, Number(page) || 1);
    const lim = Math.min(parseInt(limit) || 20, 500);

    // Determine sort option
    let sortOption = { createdAt: -1 }; // Default newest
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    else if (sort === 'mostViewed') sortOption = { views: -1 };
    else if (sort === 'leastViewed') sortOption = { views: 1 };
    else if (sort === 'hot') sortOption = { rankingScore: -1, createdAt: -1 }; // NEW: Hot feed by ranking
    else if (sort === 'mostUpvoted') sortOption = { upvoteCount: -1, createdAt: -1 }; // NEW: Most upvoted

    // Build blocked list
    let blockedIds = [];
    if (req.user) {
      const currentUser = await User.findById(req.user._id).select("blockedUsers").lean();
      blockedIds = (currentUser.blockedUsers || []).map(id => id.toString());
    }

    // Build Query Criteria
    // Base condition: Posts that are NOT in groups (Home feed usually excludes group posts)
    const baseConditions = [
      {
        $or: [
          { group: { $exists: false } },
          { group: null }
        ]
      }
    ];

    // Search text
    if (q) {
      const trimmedQuery = q.trim();
      if (trimmedQuery.length > 0 && trimmedQuery.length <= 100) {
        const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        baseConditions.push({
          $or: [
            { title: { $regex: escapedQuery, $options: "i" } },
            { content: { $regex: escapedQuery, $options: "i" } },
            { tags: { $regex: escapedQuery, $options: "i" } }
          ]
        });
      }
    }

    // Tags
    if (tag) {
      baseConditions.push({ tags: tag });
    }

    // Visibility Logic (The Core Fix)
    // 1. Public posts (status='published') AND Author NOT blocked
    // 2. Private posts (status='private') AND Author IS current user
    const visibilityCondition = {
      $or: [
        {
          status: "published",
          author: { $nin: blockedIds }
        },
        ...(req.user ? [{
          status: "private",
          author: req.user._id
        }] : [])
      ]
    };

    // Combine all
    const filter = {
      $and: [
        ...baseConditions,
        visibilityCondition
      ]
    };

    // Projection to reduce payload
    const postProjection = {
      title: 1, content: 1, slug: 1, tags: 1, createdAt: 1, author: 1, role: 1,
      status: 1, views: 1, coverUrl: 1, files: 1,
      commentCount: 1, savedCount: 1, emotes: 1, hasPoll: 1, youtubeUrl: 1,
      upvotes: 1, upvoteCount: 1, rankingScore: 1 // NEW: upvote system
    };

    // Execute Query
    const [items, total] = await Promise.all([
      Post.find(filter, postProjection)
        .populate({ path: "author", select: "name nickname avatarUrl role displayBadgeType cultivationCache" })
        .populate({ path: "emotes.user", select: "name nickname avatarUrl role displayBadgeType cultivationCache" })
        .sort(sortOption)
        .skip((pg - 1) * lim)
        .limit(lim)
        .lean(),
      Post.countDocuments(filter)
    ]);

    // FIX NESTED POPULATE: Fetch all roles in ONE query instead of nested populate
    const roleIds = new Set();
    items.forEach(post => {
      // Validate ObjectId before adding
      if (post.author?.role && mongoose.Types.ObjectId.isValid(post.author.role)) {
        roleIds.add(post.author.role.toString());
      }
      if (post.emotes) {
        post.emotes.forEach(emote => {
          if (emote.user?.role && mongoose.Types.ObjectId.isValid(emote.user.role)) {
            roleIds.add(emote.user.role.toString());
          }
        });
      }
    });

    // Single query for all roles (only if we have valid IDs)
    let rolesMap = new Map();
    if (roleIds.size > 0) {
      const Role = mongoose.model('Role');
      const roles = await Role.find({ _id: { $in: Array.from(roleIds) } })
        .select("name displayName iconUrl")
        .lean();
      roles.forEach(r => rolesMap.set(r._id.toString(), r));
    }

    // Manually populate roles
    const itemsWithRoles = items.map(post => {
      const postCopy = { ...post };

      // Populate author.role
      if (postCopy.author?.role) {
        const roleId = postCopy.author.role.toString();
        postCopy.author = {
          ...postCopy.author,
          role: rolesMap.get(roleId) || postCopy.author.role
        };
      }

      // Populate emotes.user.role
      if (postCopy.emotes) {
        postCopy.emotes = postCopy.emotes.map(emote => {
          if (emote.user?.role) {
            const roleId = emote.user.role.toString();
            return {
              ...emote,
              user: {
                ...emote.user,
                role: rolesMap.get(roleId) || emote.user.role
              }
            };
          }
          return emote;
        });
      }

      return postCopy;
    });

    // Format items
    const itemsWithCounts = itemsWithRoles.map(post => ({
      ...post,
      commentCount: post.commentCount || 0,
      savedCount: post.savedCount || 0
    }));

    res.json({
      items: itemsWithCounts,
      total,
      page: pg,
      pages: Math.ceil(total / lim),
      hasPrivatePosts: req.user ? true : false // simplified flag
    });
  } catch (e) {
    next(e);
  }
});

// List with filters & search
router.get("/", authOptional, responseCache({ ttlSeconds: 30, prefix: "posts" }), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, tag, author, q, status = "published", sort = "newest" } = req.query;
    const sanitizedLimit = Math.min(parseInt(limit) || 20, 500); // Increased max limit to 500
    const pageNum = Math.max(1, parseInt(page) || 1);

    // NOTE: responseCache middleware handles caching at a higher level
    // Removed old postCache.get() to avoid conflict

    // Get blocked list first (cache per user for 60s)
    let blockedIds = [];
    if (req.user) {
      const blockedCacheKey = `blocked:${req.user._id}`;
      let cachedBlocked = postCache.get(blockedCacheKey);
      if (!cachedBlocked) {
        const currentUser = await User.findById(req.user._id).select("blockedUsers").lean();
        cachedBlocked = (currentUser?.blockedUsers || []).map(id => id.toString());
        postCache.set(blockedCacheKey, cachedBlocked, 60);
      }
      blockedIds = cachedBlocked;
    }

    const filter = {};

    // Determine if this is a homepage feed (no specific filters)
    const isHomepageFeed = !author && !tag && !q && status === "published";

    // Determine sort option
    let sortOption = { createdAt: -1 }; // Default newest
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    else if (sort === 'mostViewed') sortOption = { views: -1 };
    else if (sort === 'leastViewed') sortOption = { views: 1 };

    if (status === "private") {
      if (!req.user) return res.status(401).json({ error: "Cần đăng nhập để xem bài riêng tư" });
      if (author && author !== "undefined" && author !== req.user._id.toString()) {
        return res.status(403).json({ error: "Chỉ có thể xem bài riêng tư của chính mình" });
      }
      filter.status = "private";
      filter.author = req.user._id;
      // Exclude posts in groups - posts without group field or with null group
      // MongoDB: when field doesn't exist, $eq: null matches it
      filter.group = { $eq: null };
    } else {
      filter.status = "published";
      // Exclude posts in groups from Home page (no author specified), but allow them for user profiles
      if (!author || author === "undefined") {
        filter.group = { $eq: null };
      }
    }

    if (tag) filter.tags = tag;
    if (author && author !== "undefined" && status !== "private") {
      // Validate MongoDB ObjectId format
      if (!mongoose.Types.ObjectId.isValid(author)) {
        return res.status(400).json({ error: "ID không hợp lệ" });
      }
      // If author is blocked, return empty result
      if (blockedIds.length > 0 && blockedIds.includes(author)) {
        return res.json({ items: [], total: 0, page: Number(page), pages: 0 });
      }
      // IMPORTANT: Convert to ObjectId for aggregation pipeline
      filter.author = new mongoose.Types.ObjectId(author);
    }

    // Apply blocked users filter (IMPORTANT)
    if (blockedIds.length > 0 && status !== "private") {
      // If filtering by specific author, already checked above
      // Otherwise, exclude blocked authors
      if (!author || author === "undefined") {
        // Convert string IDs to ObjectIds for aggregation
        const blockedObjectIds = blockedIds.map(id => new mongoose.Types.ObjectId(id));
        filter.author = { $nin: blockedObjectIds };
      }
    }

    if (q) {
      const trimmedQuery = q.trim();
      if (trimmedQuery.length > 0 && trimmedQuery.length <= 100) {
        const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = [
          { title: { $regex: escapedQuery, $options: "i" } },
          { tags: { $regex: escapedQuery, $options: "i" } }
        ];
        // Note: Removed content search for performance - use text index instead if needed
      }
    }

    // OPTIMIZATION: Use parallel queries instead of $facet (faster for large datasets)
    const skip = (pageNum - 1) * sanitizedLimit;

    // Build lightweight aggregation pipeline (no $facet)
    const pipeline = [
      { $match: filter },
      { $sort: sortOption },
      { $skip: skip },
      { $limit: sanitizedLimit },
      // Lookup author with minimal fields
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "authorData",
          pipeline: [
            { $project: { _id: 1, name: 1, nickname: 1, avatarUrl: 1, role: 1, displayBadgeType: 1, cultivationCache: 1 } }
          ]
        }
      },
      { $unwind: { path: "$authorData", preserveNullAndEmptyArrays: true } },
      // Lookup group
      {
        $lookup: {
          from: "groups",
          localField: "group",
          foreignField: "_id",
          as: "groupData",
          pipeline: [{ $project: { name: 1, coverUrl: 1, privacy: 1 } }]
        }
      },
      { $unwind: { path: "$groupData", preserveNullAndEmptyArrays: true } },
      // Project only needed fields - IMPORTANT: _id is excluded by default in $project, must explicitly include
      {
        $project: {
          _id: 1, // Must include _id explicitly!
          title: 1,
          content: { $substrCP: ["$content", 0, 500] }, // Truncate content for list view
          slug: 1,
          tags: 1,
          createdAt: 1,
          views: 1,
          coverUrl: 1,
          status: 1, // Include status for profile filtering
          files: { $slice: ["$files", 4] }, // Limit files to 4
          commentCount: { $ifNull: ["$commentCount", 0] },
          savedCount: { $ifNull: ["$savedCount", 0] },
          emotes: { $slice: ["$emotes", 10] }, // Limit emotes to 10 for list view (legacy)
          emoteCount: { $size: { $ifNull: ["$emotes", []] } }, // Total emote count for stats (legacy)
          // NEW: Upvote system
          upvotes: { $ifNull: ["$upvotes", []] },
          upvoteCount: { $ifNull: ["$upvoteCount", 0] },
          rankingScore: { $ifNull: ["$rankingScore", 0] },
          hasPoll: 1,
          youtubeUrl: 1,
          author: "$authorData",
          group: "$groupData"
        }
      }
    ];

    // Run items query and count in parallel
    const [items, total] = await Promise.all([
      Post.aggregate(pipeline),
      // Use estimatedDocumentCount for homepage (much faster), countDocuments for filtered
      isHomepageFeed && pageNum === 1
        ? Post.estimatedDocumentCount()
        : Post.countDocuments(filter)
    ]);

    // FIX NESTED POPULATE: Fetch all roles in ONE query instead of nested populate
    const roleIds = new Set();
    items.forEach(post => {
      // Validate ObjectId before adding
      if (post.author?.role && mongoose.Types.ObjectId.isValid(post.author.role)) {
        roleIds.add(post.author.role.toString());
      }
      if (post.emotes) {
        post.emotes.forEach(emote => {
          if (emote.user?.role && mongoose.Types.ObjectId.isValid(emote.user.role)) {
            roleIds.add(emote.user.role.toString());
          }
        });
      }
    });

    // Single query for all roles (only if we have valid IDs)
    let rolesMap = new Map();
    if (roleIds.size > 0) {
      const Role = mongoose.model('Role');
      const roles = await Role.find({ _id: { $in: Array.from(roleIds) } })
        .select("name displayName iconUrl")
        .lean();
      roles.forEach(r => rolesMap.set(r._id.toString(), r));
    }

    // Manually populate roles
    const itemsWithRoles = items.map(post => {
      const postCopy = { ...post };

      // Populate author.role
      if (postCopy.author?.role) {
        const roleId = postCopy.author.role.toString();
        postCopy.author = {
          ...postCopy.author,
          role: rolesMap.get(roleId) || postCopy.author.role
        };
      }

      // Populate emotes.user.role
      if (postCopy.emotes) {
        postCopy.emotes = postCopy.emotes.map(emote => {
          if (emote.user?.role) {
            const roleId = emote.user.role.toString();
            return {
              ...emote,
              user: {
                ...emote.user,
                role: rolesMap.get(roleId) || emote.user.role
              }
            };
          }
          return emote;
        });
      }

      return postCopy;
    });

    const response = {
      items: itemsWithRoles,
      total,
      page: pageNum,
      pages: Math.ceil(total / sanitizedLimit)
    };

    // NOTE: responseCache middleware handles caching, removed old postCache.set()

    res.json(response);
  } catch (e) {
    next(e);
  }
});

// Get by slug - Enhanced with isSaved and groupContext
router.get("/slug/:slug", authOptional, async (req, res, next) => {
  try {
    // FIX DUPLICATE QUERY: Query once with $or instead of twice
    // FIX NESTED POPULATE: Only populate 1 level, fetch roles separately
    let post = await Post.findOneAndUpdate(
      {
        slug: req.params.slug,
        status: { $in: ["published", "private"] }
      },
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate({ path: "author", select: "name nickname avatarUrl role displayBadgeType blockedUsers cultivationCache" })
      .populate({ path: "emotes.user", select: "name nickname avatarUrl role cultivationCache" })
      .populate({ path: "mentions", select: "name nickname avatarUrl email _id" })
      .populate({ path: "group", select: "name settings members" })
      .lean();

    if (!post) {
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }

    // Check permission for private posts
    if (post.status === "private") {
      if (!req.headers.authorization && !req.cookies?.token) {
        return res.status(401).json({ error: "Cần đăng nhập để xem bài viết này" });
      }
      try {
        let token = req.cookies?.token;
        if (!token) {
          const header = req.headers.authorization || "";
          token = header.startsWith("Bearer ") ? header.slice(7) : null;
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (post.author._id.toString() !== decoded.id) {
          return res.status(403).json({ error: "Bạn không có quyền xem bài viết này" });
        }
      } catch {
        return res.status(401).json({ error: "Token không hợp lệ" });
      }
    }

    // FIX NESTED POPULATE: Fetch all roles in ONE query
    const roleIds = new Set();
    // Validate and collect only valid ObjectIds
    if (post.author?.role && mongoose.Types.ObjectId.isValid(post.author.role)) {
      roleIds.add(post.author.role.toString());
    }
    if (post.emotes) {
      post.emotes.forEach(emote => {
        if (emote.user?.role && mongoose.Types.ObjectId.isValid(emote.user.role)) {
          roleIds.add(emote.user.role.toString());
        }
      });
    }

    // Single query for all roles (only if we have valid IDs)
    let rolesMap = new Map();
    if (roleIds.size > 0) {
      const Role = mongoose.model('Role');
      const roles = await Role.find({ _id: { $in: Array.from(roleIds) } })
        .select("name displayName iconUrl")
        .lean();
      roles.forEach(r => rolesMap.set(r._id.toString(), r));
    }

    // Manually populate roles
    if (post.author?.role) {
      const roleId = post.author.role.toString();
      post.author.role = rolesMap.get(roleId) || post.author.role;
    }

    if (post.emotes) {
      post.emotes = post.emotes.map(emote => {
        if (emote.user?.role) {
          const roleId = emote.user.role.toString();
          return {
            ...emote,
            user: {
              ...emote.user,
              role: rolesMap.get(roleId) || emote.user.role
            }
          };
        }
        return emote;
      });
    }

    // Fetch comments and check if saved in parallel
    const [comments, isSaved] = await Promise.all([
      Comment.find({ post: post._id })
        .populate({ path: "author", select: "name nickname avatarUrl role displayBadgeType cultivationCache" })
        .populate("parent", "_id")
        .sort({ createdAt: -1 })
        .lean(),
      // Check if post is saved by current user
      req.user ?
        User.findById(req.user._id).select("savedPosts").lean().then(user =>
          (user?.savedPosts || []).some(id => id.toString() === post._id.toString())
        ) :
        Promise.resolve(false)
    ]);

    // FIX NESTED POPULATE: Fetch comment author roles in ONE query
    const commentRoleIds = new Set();
    comments.forEach(comment => {
      // Validate ObjectId before adding
      if (comment.author?.role && mongoose.Types.ObjectId.isValid(comment.author.role)) {
        commentRoleIds.add(comment.author.role.toString());
      }
    });

    if (commentRoleIds.size > 0) {
      const Role = mongoose.model('Role');
      const commentRoles = await Role.find({ _id: { $in: Array.from(commentRoleIds) } })
        .select("name displayName iconUrl")
        .lean();
      const commentRolesMap = new Map();
      commentRoles.forEach(r => commentRolesMap.set(r._id.toString(), r));

      // Populate roles for comments
      comments.forEach(comment => {
        if (comment.author?.role) {
          const roleId = comment.author.role.toString();
          comment.author.role = commentRolesMap.get(roleId) || comment.author.role;
        }
      });
    }

    // Get group context if post belongs to a group
    let groupContext = null;
    if (post.group && req.user) {
      const group = post.group;
      const member = group.members?.find(m => m.user?.toString() === req.user._id.toString());
      groupContext = {
        userRole: member?.role || null,
        settings: group.settings || {}
      };
    }

    // FIX: post is already a plain object (from .lean()), no need for .toObject()
    const postObject = {
      ...post,
      commentCount: comments.length,
      isSaved,
      groupContext
    };

    res.json({ post: postObject, comments });
  } catch (e) {
    next(e);
  }
});

// Get post by ID (for editing)
router.get("/edit/:id", authRequired, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate("author", "name avatarUrl role");
    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });
    if (post.author._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Bạn không có quyền xem bài viết này" });
    }
    res.json({ post });
  } catch (e) {
    next(e);
  }
});

// Create
router.post("/", authRequired, checkBanStatus, postCreationLimiter, async (req, res, next) => {
  try {
    const { title: rawTitle, content, tags = [], coverUrl = "", status = "published", files = [], group = null, youtubeUrl = "" } = req.body;
    if (!["private", "published"].includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }

    // Validate content is required
    const trimmedContent = (content || "").trim();
    if (!trimmedContent) {
      return res.status(400).json({ error: "Vui lòng nhập nội dung" });
    }

    // Auto-generate title from content if not provided
    let title = (rawTitle || "").trim();
    if (!title) {
      // Strip markdown, take first 60 chars, cut at word boundary
      const plainContent = trimmedContent
        .replace(/[#*_`~\[\]()>]/g, "") // Remove markdown chars
        .replace(/\s+/g, " ")           // Normalize whitespace
        .trim();

      if (plainContent.length <= 60) {
        title = plainContent;
      } else {
        // Cut at word boundary and add ellipsis
        title = plainContent.slice(0, 60).replace(/\s+\S*$/, "") + "…";
      }
    }

    // Sanitize input để chống XSS
    const { error: sanitizeError, sanitized } = sanitizePostFields({ title, content: trimmedContent, tags, coverUrl });

    // Reject if XSS detected
    if (sanitizeError) {
      return res.status(400).json({ error: sanitizeError });
    }

    // Validate và sanitize YouTube URL
    const sanitizedYoutubeUrl = youtubeUrl ? sanitizePlain(youtubeUrl) : "";

    // Extract mentions from title and content
    const { extractMentionedUsers } = await import("../utils/mentions.js");
    const mentionedText = `${sanitized.title || ""} ${sanitized.content || ""}`;
    const mentionedUserIds = await extractMentionedUsers(mentionedText);

    const post = await Post.create({
      author: req.user._id,
      title: sanitized.title,
      content: sanitized.content || "",
      tags: sanitized.tags || [],
      coverUrl: sanitized.coverUrl || "",
      status,
      files: Array.isArray(files) ? files : [],
      group,
      mentions: mentionedUserIds,
      youtubeUrl: sanitizedYoutubeUrl
    });

    // Create mention notifications
    if (mentionedUserIds.length > 0) {
      try {
        const NotificationService = (await import("../services/NotificationService.js")).default;
        const populatedPost = await Post.findById(post._id)
          .populate("author", "name")
          .lean();
        await NotificationService.createPostMentionNotification(
          populatedPost,
          mentionedUserIds,
          req.user
        );
      } catch (notifError) {
        // Silent fail for notifications - don't break post creation
        console.error("[ERROR][POSTS] Failed to create mention notifications:", notifError);
      }
    }

    // Invalidate both in-memory and Redis cache for posts
    invalidateCache(postCache, `my-posts:${req.user._id.toString()}`);
    invalidateCache(postCache, `posts:`);
    // Also invalidate Redis cache
    invalidateByPattern("feed:*").catch(() => { });
    invalidateByPattern("posts:*").catch(() => { });
    invalidateByPattern("smart:*").catch(() => { });

    // Cộng exp cho việc đăng bài
    try {
      await addExpForAction(req.user._id, 'post', { description: 'Đăng bài viết mới' });
    } catch (expError) {
      console.error('[POSTS] Error adding exp:', expError);
    }

    // Mark first post for new user onboarding
    try {
      await WelcomeService.markFirstPost(req.user._id, post._id);
    } catch (welcomeError) {
      // Silent fail - don't break post creation
      console.error('[POSTS] Error marking first post:', welcomeError);
    }

    res.json({ post });
  } catch (e) {
    next(e);
  }
});

// Update
router.put("/:id", authRequired, checkBanStatus, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa bài viết này" });
    }
    const { title, content, tags, coverUrl, status, files, youtubeUrl } = req.body;
    const { error: sanitizeError, sanitized: sanitizedUpdate } = sanitizePostFields({ title, content, tags, coverUrl });

    // Reject if XSS detected
    if (sanitizeError) {
      return res.status(400).json({ error: sanitizeError });
    }

    if (title !== undefined) {
      post.title = sanitizedUpdate.title || "";
    }

    if (content !== undefined) {
      post.content = sanitizedUpdate.content || "";
    }

    if (tags !== undefined) {
      post.tags = sanitizedUpdate.tags || [];
    }

    if (coverUrl !== undefined) {
      post.coverUrl = sanitizedUpdate.coverUrl || "";
    }

    if (Array.isArray(files)) {
      post.files = files;
    }

    // Update YouTube URL if provided
    if (youtubeUrl !== undefined) {
      post.youtubeUrl = youtubeUrl ? sanitizePlain(youtubeUrl) : "";
    }

    if (!["private", "published"].includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }
    post.status = status;

    // Update mentions if title or content changed
    if (title !== undefined || content !== undefined) {
      const { extractMentionedUsers } = await import("../utils/mentions.js");
      const finalTitle = title !== undefined ? sanitizedUpdate.title : post.title;
      const finalContent = content !== undefined ? sanitizedUpdate.content : post.content;
      const mentionedText = `${finalTitle || ""} ${finalContent || ""}`;
      const mentionedUserIds = await extractMentionedUsers(mentionedText);
      post.mentions = mentionedUserIds;
    }

    await post.save();

    // Invalidate both in-memory and Redis cache
    invalidateCache(postCache, `my-posts:${post.author.toString()}`);
    invalidateCache(postCache, `posts:`);
    invalidateByPattern("feed:*").catch(() => { });
    invalidateByPattern("posts:*").catch(() => { });
    invalidateByPattern("smart:*").catch(() => { });

    res.json({ post });
  } catch (e) {
    next(e);
  }
});

// Delete
router.delete("/:id", authRequired, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Bạn không có quyền xóa bài viết này" });
    }
    await Comment.deleteMany({ post: post._id });
    await post.deleteOne();

    // Invalidate both in-memory and Redis cache
    invalidateCache(postCache, `my-posts:${post.author.toString()}`);
    invalidateCache(postCache, `posts:`);
    invalidateByPattern("feed:*").catch(() => { });
    invalidateByPattern("posts:*").catch(() => { });
    invalidateByPattern("smart:*").catch(() => { });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Emote
router.post("/:id/emote", authRequired, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });

    const { emote } = req.body;
    if (!emote || typeof emote !== "string") {
      return res.status(400).json({ error: "Biểu cảm không hợp lệ" });
    }

    const uid = req.user._id.toString();
    const existed = post.emotes.find(e => e.user.toString() === uid && e.type === emote);

    let isNewLike = false;
    if (existed) {
      post.emotes = post.emotes.filter(e => !(e.user.toString() === uid && e.type === emote));
    } else {
      const hadPreviousEmote = post.emotes.some(e => e.user.toString() === uid);
      post.emotes = post.emotes.filter(e => e.user.toString() !== uid);
      post.emotes.push({ user: req.user._id, type: emote });
      isNewLike = !hadPreviousEmote; // Chỉ cộng exp nếu là lần đầu like
    }

    await post.save();
    await post.populate("emotes.user", "name nickname avatarUrl role");

    // Cộng exp cho cả người like và người được like (nếu là lần đầu)
    if (isNewLike) {
      try {
        // Cộng exp cho người like
        await addExpForAction(req.user._id, 'like', { description: 'Thích bài viết' });
        // Cộng exp cho tác giả bài viết
        if (post.author.toString() !== req.user._id.toString()) {
          await addExpForReceiver(post.author, 'like');
        }
      } catch (expError) {
        console.error('[POSTS] Error adding emote exp:', expError);
      }
    }

    // Gửi notification cho tác giả bài viết (nếu không phải bỏ emote)
    if (!existed) {
      try {
        const NotificationService = (await import("../services/NotificationService.js")).default;
        await NotificationService.createReactionNotification(post, req.user, emote);
      } catch (notifError) {
        console.error('[POSTS] Error creating reaction notification:', notifError);
      }
    }

    res.json({ emotes: post.emotes });
  } catch (e) {
    next(e);
  }
});

// ==================== UPVOTE SYSTEM (NEW) ====================
// Toggle upvote on a post
router.post("/:id/upvote", authRequired, postInteractionLimiter, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });

    const userId = req.user._id;
    const userIdStr = userId.toString();
    
    // Check if user already upvoted
    const upvoteIndex = post.upvotes.findIndex(id => id.toString() === userIdStr);
    const hasUpvoted = upvoteIndex !== -1;
    
    let isNewUpvote = false;
    
    if (hasUpvoted) {
      // Remove upvote
      post.upvotes.splice(upvoteIndex, 1);
      post.upvoteCount = Math.max(0, (post.upvoteCount || 0) - 1);
    } else {
      // Add upvote
      post.upvotes.push(userId);
      post.upvoteCount = (post.upvoteCount || 0) + 1;
      isNewUpvote = true;
    }
    
    // Recalculate ranking score
    const { calculateRankingScore } = await import("../utils/smartFeed.js");
    post.rankingScore = calculateRankingScore(post);
    post.lastRankingUpdate = new Date();
    
    await post.save();
    
    // Award EXP for new upvotes
    if (isNewUpvote) {
      try {
        // EXP for upvoter
        await addExpForAction(userId, 'upvote', { description: 'Upvote bài viết' });
        // EXP for author (if not self-upvote)
        if (post.author.toString() !== userIdStr) {
          await addExpForReceiver(post.author, 'upvote');
          
          // Check achievement: "popular_post" - có bài viết được 50 upvote
          try {
            const Cultivation = (await import("../models/Cultivation.js")).default;
            const authorCultivation = await Cultivation.findOne({ user: post.author });
            if (authorCultivation) {
              // Update achievement progress based on current upvoteCount
              const popularPostQuest = authorCultivation.achievements.find(a => a.questId === 'popular_post');
              if (popularPostQuest && !popularPostQuest.completed) {
                // Check if any post has reached the threshold
                const Post = (await import("../models/Post.js")).default;
                const topPost = await Post.findOne({ 
                  author: post.author,
                  upvoteCount: { $gte: 50 }
                }).sort({ upvoteCount: -1 }).lean();
                
                if (topPost) {
                  // Update progress to max (achievement completed)
                  popularPostQuest.progress = 50;
                  popularPostQuest.completed = true;
                  popularPostQuest.completedAt = new Date();
                  await authorCultivation.save();
                }
              }
            }
          } catch (achievementError) {
            console.error('[POSTS] Error checking popular_post achievement:', achievementError);
          }
        }
      } catch (expError) {
        console.error('[POSTS] Error adding upvote exp:', expError);
      }
    }
    
    // Send notification for new upvotes
    if (isNewUpvote && post.author.toString() !== userIdStr) {
      try {
        const NotificationService = (await import("../services/NotificationService.js")).default;
        await NotificationService.createReactionNotification(post, req.user, 'upvote');
      } catch (notifError) {
        console.error('[POSTS] Error creating upvote notification:', notifError);
      }
    }
    
    res.json({ 
      upvoted: !hasUpvoted,
      upvoteCount: post.upvoteCount,
      rankingScore: post.rankingScore
    });
  } catch (e) {
    next(e);
  }
});

// Check if user has upvoted a post
router.get("/:id/upvote", authRequired, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).select('upvotes upvoteCount').lean();
    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });
    
    const userIdStr = req.user._id.toString();
    const hasUpvoted = post.upvotes?.some(id => id.toString() === userIdStr) || false;
    
    res.json({
      upvoted: hasUpvoted,
      upvoteCount: post.upvoteCount || 0
    });
  } catch (e) {
    next(e);
  }
});

// ==================== ANALYTICS ====================
// Get user analytics data
router.get("/analytics", authRequired, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { period = '30d' } = req.query;

    // Calculate date range based on period
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setDate(startDate.getDate() - 365);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get all user posts with view counts and upvotes
    const posts = await Post.find({
      author: userId
    })
      .select('title slug views upvoteCount createdAt status')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate total views and total upvotes
    const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
    const totalUpvotes = posts.reduce((sum, post) => sum + (post.upvoteCount || 0), 0);

    // Get posts from the specified period
    const recentPosts = posts.filter(post =>
      new Date(post.createdAt) >= startDate
    );

    // FIX DATE RANGE LOOP: Generate date array efficiently without blocking loop
    const viewsByDay = {};
    const currentDate = new Date();
    const daysDiff = Math.ceil((currentDate - startDate) / (1000 * 60 * 60 * 24));

    // Generate dates efficiently using Array.from
    Array.from({ length: daysDiff + 1 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      viewsByDay[dateKey] = 0;
    });

    // Get top posts (by views)
    const topPosts = posts
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 10);

    // Calculate growth metrics
    const totalPosts = posts.length;
    const publishedPosts = posts.filter(p => p.status === 'published').length;
    const privatePosts = posts.filter(p => p.status === 'private').length;

    // Average views per post
    const avgViewsPerPost = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;

    res.json({
      success: true,
      analytics: {
        totalViews,
        totalUpvotes,
        totalPosts,
        publishedPosts,
        privatePosts,
        avgViewsPerPost,
        topPosts: topPosts.map(post => ({
          _id: post._id,
          title: post.title,
          slug: post.slug,
          views: post.views || 0,
          createdAt: post.createdAt,
          status: post.status
        })),
        recentPosts: recentPosts.map(post => ({
          _id: post._id,
          title: post.title,
          slug: post.slug,
          views: post.views || 0,
          createdAt: post.createdAt,
          status: post.status
        })),
        viewsByDay,
        period
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user daily analytics for charts
router.get("/analytics/daily", authRequired, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const days = Math.min(365, Math.max(7, parseInt(req.query.days) || 30));

    // Use Vietnam timezone (UTC+7) for consistent date calculations
    const vietnamTimezone = "Asia/Ho_Chi_Minh";
    const vietnamOffset = 7 * 60 * 60 * 1000; // 7 hours in milliseconds

    // Calculate current time in Vietnam
    const now = new Date();
    const nowInVietnam = new Date(now.getTime() + vietnamOffset);

    // Calculate start date (days ago from today in Vietnam timezone)
    const startDateInVietnam = new Date(nowInVietnam);
    startDateInVietnam.setUTCHours(0, 0, 0, 0);
    startDateInVietnam.setUTCDate(startDateInVietnam.getUTCDate() - days + 1);

    // Convert back to UTC for MongoDB query
    const startDateUTC = new Date(startDateInVietnam.getTime() - vietnamOffset);

    // Get daily posts aggregation for this user
    const dailyPosts = await Post.aggregate([
      { $match: { author: userId, createdAt: { $gte: startDateUTC } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: vietnamTimezone } },
          count: { $sum: 1 },
          views: { $sum: "$views" },
          upvotes: { $sum: { $ifNull: ["$upvoteCount", 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Create map for lookup
    const postsMap = new Map(dailyPosts.map(d => [d._id, d]));

    // Generate complete date range using Vietnam timezone
    const chartData = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDateInVietnam.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      // Format label as dd-mm
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const dayLabel = `${day}-${month}`;

      const postData = postsMap.get(dateStr) || { count: 0, views: 0, upvotes: 0 };

      chartData.push({
        date: dateStr,
        label: dayLabel,
        posts: postData.count || 0,
        views: postData.views || 0,
        upvotes: postData.upvotes || 0
      });
    }

    // Get all-time totals for this user
    const allPosts = await Post.find({ author: userId }).select('views upvoteCount').lean();
    const allTimeTotals = {
      posts: allPosts.length,
      views: allPosts.reduce((sum, p) => sum + (p.views || 0), 0),
      upvotes: allPosts.reduce((sum, p) => sum + (p.upvoteCount || 0), 0)
    };

    // Calculate period totals and baseline
    const periodTotals = {
      posts: chartData.reduce((sum, d) => sum + d.posts, 0),
      views: chartData.reduce((sum, d) => sum + d.views, 0),
      upvotes: chartData.reduce((sum, d) => sum + d.upvotes, 0)
    };

    const baseline = {
      posts: allTimeTotals.posts - periodTotals.posts,
      views: allTimeTotals.views - periodTotals.views,
      upvotes: allTimeTotals.upvotes - periodTotals.upvotes
    };

    res.json({
      success: true,
      days,
      chartData,
      allTimeTotals,
      baseline,
      periodTotals
    });
  } catch (error) {
    next(error);
  }
});

// ==================== SAVED POSTS ====================

// Batch check if posts are saved by current user
router.get("/is-saved", authRequired, async (req, res, next) => {
  try {
    const rawIds = req.query.ids;
    if (!rawIds) {
      return res.json({});
    }

    const ids = rawIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return res.json({});
    }

    // Filter valid ObjectIds but keep original ids so client gets consistent keys
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      // No valid ids, respond with false for provided ids
      const emptyResponse = Object.fromEntries(ids.map((id) => [id, false]));
      return res.json(emptyResponse);
    }

    const user = await User.findById(req.user._id).select("savedPosts");
    const savedIds = new Set(
      (user?.savedPosts || []).map((savedId) => savedId.toString())
    );

    const response = Object.fromEntries(ids.map((id) => [id, savedIds.has(id)]));
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Toggle save/unsave a post
router.post("/:id/save", authRequired, postInteractionLimiter, async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Post ID không hợp lệ" });
    }

    const post = await Post.findById(postId).select("_id status author");
    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });

    // Optional: If post is private and not owner, do not allow save
    if (post.status === "private" && post.author.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Không thể lưu bài viết riêng tư của người khác" });
    }

    const user = await User.findById(userId).select("savedPosts");
    const alreadySaved = user.savedPosts?.some(id => id.toString() === postId);

    if (alreadySaved) {
      user.savedPosts = user.savedPosts.filter(id => id.toString() !== postId);
      await Post.findByIdAndUpdate(postId, { $inc: { savedCount: -1 } });
    } else {
      user.savedPosts = user.savedPosts || [];
      user.savedPosts.unshift(postId);
      await Post.findByIdAndUpdate(postId, { $inc: { savedCount: 1 } });
    }

    await user.save();

    // Lấy số lượng saved từ Post model (đã denormalized)
    const updatedPost = await Post.findById(postId).select("savedCount");
    const savedCount = updatedPost ? updatedPost.savedCount : 0;

    res.json({ saved: !alreadySaved, savedCount });
  } catch (e) { next(e); }
});

// Check if a post is saved by current user
router.get("/:id/is-saved", authRequired, async (req, res, next) => {
  try {
    const postId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Post ID không hợp lệ" });
    }
    const user = await User.findById(req.user._id).select("savedPosts");
    const saved = (user.savedPosts || []).some(id => id.toString() === postId);
    res.json({ saved });
  } catch (e) { next(e); }
});

// Get interest status for a post
router.get("/:id/interest-status", authRequired, async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Post ID không hợp lệ" });
    }

    const user = await User.findById(userId).select("interestedPosts notInterestedPosts").lean();
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    const interestedPosts = (user.interestedPosts || []).map(id => id.toString());
    const notInterestedPosts = (user.notInterestedPosts || []).map(id => id.toString());
    const postIdStr = postId.toString();

    let interested = null;
    if (interestedPosts.includes(postIdStr)) {
      interested = true;
    } else if (notInterestedPosts.includes(postIdStr)) {
      interested = false;
    }

    res.json({ interested });
  } catch (error) {
    next(error);
  }
});

// Toggle interest/not interested for a post
router.post("/:id/interest", authRequired, postInteractionLimiter, async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const { interested } = req.body; // true = quan tâm, false = không quan tâm

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Post ID không hợp lệ" });
    }

    if (typeof interested !== 'boolean') {
      return res.status(400).json({ error: "Giá trị 'interested' phải là boolean" });
    }

    const post = await Post.findById(postId).select("_id status author");
    if (!post) {
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }

    if (post.status === "private" && post.author.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Không thể đánh dấu bài viết riêng tư của người khác" });
    }

    const user = await User.findById(userId).select("interestedPosts notInterestedPosts");

    // Remove from both lists first (toggle behavior)
    user.interestedPosts = (user.interestedPosts || []).filter(id => id.toString() !== postId);
    user.notInterestedPosts = (user.notInterestedPosts || []).filter(id => id.toString() !== postId);

    // Add to appropriate list based on interested value
    if (interested) {
      user.interestedPosts = user.interestedPosts || [];
      if (!user.interestedPosts.some(id => id.toString() === postId)) {
        user.interestedPosts.unshift(postId);
      }
    } else {
      user.notInterestedPosts = user.notInterestedPosts || [];
      if (!user.notInterestedPosts.some(id => id.toString() === postId)) {
        user.notInterestedPosts.unshift(postId);
      }
    }

    await user.save();

    res.json({
      success: true,
      interested,
      message: interested
        ? "Đã đánh dấu quan tâm bài viết này"
        : "Đã đánh dấu không quan tâm bài viết này"
    });
  } catch (error) {
    next(error);
  }
});

// Get saved posts list
router.get("/saved/list", authRequired, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const user = await User.findById(req.user._id).select("savedPosts");
    const ids = (user.savedPosts || []).map(id => id.toString());

    const start = (parseInt(page) - 1) * parseInt(limit);
    const end = start + parseInt(limit);
    const pageIds = ids.slice(start, end);

    const posts = await Post.find({ _id: { $in: pageIds } })
      .populate("author", "name nickname avatarUrl role displayBadgeType cultivationCache")
      .populate("group", "name")
      .populate({
        path: "emotes.user",
        select: "name nickname avatarUrl role displayBadgeType cultivationCache"
      })
      .sort({ createdAt: -1 });

    // Use denormalized savedCount directly
    const postsWithSavedCount = posts.map(post => {
      const postObj = post.toObject ? post.toObject() : post;
      return {
        ...postObj,
        savedCount: post.savedCount || 0
      };
    });

    res.json({
      posts: postsWithSavedCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: ids.length,
        pages: Math.ceil(ids.length / parseInt(limit))
      }
    });
  } catch (e) { next(e); }
});

// ==================== FEATURED POSTS ====================
// Toggle feature/unfeature a post on user profile
router.post("/:id/feature", authRequired, postInteractionLimiter, async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Post ID không hợp lệ" });
    }

    // Verify post exists and belongs to user
    const post = await Post.findById(postId).select("_id author status");
    if (!post) {
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }

    // Only allow featuring own posts
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Chỉ có thể ghim bài viết của bạn" });
    }

    // Only allow featuring published posts
    if (post.status !== "published") {
      return res.status(400).json({ error: "Chỉ có thể ghim bài viết đã công khai" });
    }

    const user = await User.findById(userId).select("featuredPosts");
    const featuredPosts = user.featuredPosts || [];
    const postIdStr = postId.toString();
    const idx = featuredPosts.findIndex(id => id.toString() === postIdStr);

    let isFeatured = false;
    if (idx >= 0) {
      // Unfeature
      featuredPosts.splice(idx, 1);
    } else {
      // Feature - check limit
      if (featuredPosts.length >= 5) {
        return res.status(400).json({
          error: "Đã đạt giới hạn 5 bài viết ghim. Vui lòng bỏ ghim bài khác trước."
        });
      }
      featuredPosts.unshift(new mongoose.Types.ObjectId(postId));
      isFeatured = true;
    }

    user.featuredPosts = featuredPosts;
    await user.save();

    res.json({
      success: true,
      isFeatured,
      featuredPosts: user.featuredPosts,
      message: isFeatured ? "Đã ghim bài viết lên profile" : "Đã bỏ ghim bài viết"
    });
  } catch (error) {
    next(error);
  }
});

// Get featured posts for a user
router.get("/featured/:userId", authOptional, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "User ID không hợp lệ" });
    }

    const user = await User.findById(userId)
      .select("featuredPosts")
      .populate({
        path: "featuredPosts",
        populate: {
          path: "author",
          select: "name nickname avatarUrl role displayBadgeType cultivationCache"
        }
      });

    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    // Filter out any posts that no longer exist or are private
    const validPosts = (user.featuredPosts || []).filter(post =>
      post && post.status === "published"
    );

    res.json({
      success: true,
      featuredPosts: validPosts
    });
  } catch (error) {
    next(error);
  }
});

export default router;