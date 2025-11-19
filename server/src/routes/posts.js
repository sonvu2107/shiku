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
import { generateSmartFeed } from "../utils/smartFeed.js";
import mongoose from "mongoose";

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

  if (title !== undefined) {
    sanitized.title = sanitizePlain(title);
  }

  if (content !== undefined) {
    sanitized.content = sanitizeRichContent(content);
  }

  if (tags !== undefined) {
    sanitized.tags = normalizeTags(tags);
  }

  if (coverUrl !== undefined) {
    sanitized.coverUrl = sanitizePlain(coverUrl);
  }

  return sanitized;
};

const router = express.Router();

// Get current user's posts only (both published and private) - Optimized with caching
router.get("/my-posts", authRequired, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const sanitizedLimit = Math.min(parseInt(limit) || 20, 50); // Hard limit max 50
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
              pipeline: [{ $project: { name: 1, nickname: 1, avatarUrl: 1 } }]
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
              pipeline: [{ $project: { name: 1, nickname: 1, avatarUrl: 1, role: 1 } }]
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

// Get current user's published posts only
router.get("/my-published", authRequired, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const sanitizedLimit = Math.min(parseInt(limit) || 20, 50); // Hard limit max 50
    const filter = { 
      author: req.user._id,
      status: "published"
    };
    
    // Exclude group posts from personal profile
    filter.$and = [
      {
        $or: [
          { group: { $exists: false } },
          { group: null }
        ]
      }
    ];
    
    const posts = await Post.find(filter)
      .populate("author", "name nickname avatarUrl")
      .populate("group", "name")
      .sort({ createdAt: -1 })
      .limit(sanitizedLimit)
      .skip((page - 1) * sanitizedLimit);
    
    const total = await Post.countDocuments(filter);
    
    res.json({
      posts,
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

// Get current user's private posts only
router.get("/my-private", authRequired, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const sanitizedLimit = Math.min(parseInt(limit) || 20, 50); // Hard limit max 50
    const filter = { 
      author: req.user._id,
      status: "private"
    };
    
    // Exclude group posts from personal profile
    filter.$and = [
      {
        $or: [
          { group: { $exists: false } },
          { group: null }
        ]
      }
    ];
    
    const posts = await Post.find(filter)
      .populate("author", "name nickname avatarUrl")
      .populate("group", "name")
      .sort({ createdAt: -1 })
      .limit(sanitizedLimit)
      .skip((page - 1) * sanitizedLimit);
    
    const total = await Post.countDocuments(filter);
    
    res.json({
      posts,
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

// Get posts by specific user ID (public posts only)
router.get("/user-posts", authOptional, async (req, res, next) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;
    const sanitizedLimit = Math.min(parseInt(limit) || 20, 50); // Hard limit max 50
    
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
      .populate("author", "name nickname avatarUrl")
      .populate("group", "name")
      .populate({
        path: "emotes.user",
        select: "name nickname avatarUrl role"
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
    const { page = 1, limit = 20 } = req.query;
    const sanitizedLimit = Math.min(parseInt(limit) || 20, 50); // Hard limit max 50
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
router.get("/feed", authOptional, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, tag, q, sort = "newest" } = req.query;
    const pg = Math.max(1, Number(page) || 1);
    const lim = Math.min(parseInt(limit) || 20, 50);

    // Determine sort option
    let sortOption = { createdAt: -1 }; // Default newest
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    else if (sort === 'mostViewed') sortOption = { views: -1 };
    else if (sort === 'leastViewed') sortOption = { views: 1 };

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
      title: 1, slug: 1, tags: 1, createdAt: 1, author: 1, role: 1,
      status: 1, views: 1, coverUrl: 1, files: 1,
      commentCount: 1, savedCount: 1, emotes: 1, hasPoll: 1
    };

    // Execute Query
    const [items, total] = await Promise.all([
      Post.find(filter, postProjection)
        .populate({ path: "author", select: "name nickname avatarUrl role" })
        .populate({ path: "emotes.user", select: "name nickname avatarUrl role" })
        .sort(sortOption)
        .skip((pg - 1) * lim)
        .limit(lim)
        .lean(),
      Post.countDocuments(filter)
    ]);

    // Format items
    const itemsWithCounts = items.map(post => ({
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

// Legacy endpoint - keep for backward compatibility
router.get("/feed-legacy", authOptional, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, tag, q } = req.query;
    const sanitizedLimit = Math.min(parseInt(limit) || 20, 50); // Hard limit max 50
    const filter = { status: "published" };

    // Exclude group posts from homepage feed
    filter.$and = [
      {
        $or: [
          { group: { $exists: false } },
          { group: null }
        ]
      }
    ];

    // Add blocked users filter
    if (req.user) {
      const currentUser = await User.findById(req.user._id).select("blockedUsers").lean();
      const blockedIds = (currentUser.blockedUsers || []).map(id => id.toString());
      if (blockedIds.length > 0) {
        filter.author = { $nin: blockedIds };
      }
    }

    if (tag) filter.tags = tag;

    if (q) {
      const trimmedQuery = q.trim();
      if (trimmedQuery.length > 0 && trimmedQuery.length <= 100) {
        const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$and.push({
          $or: [
            { title: { $regex: escapedQuery, $options: "i" } },
            { content: { $regex: escapedQuery, $options: "i" } }
          ]
        });
      }
    }
    
    const posts = await Post.find(filter)
      .populate("author", "name nickname avatarUrl")
      .populate("group", "name")
      .sort({ createdAt: -1 })
      .limit(sanitizedLimit)
      .skip((page - 1) * sanitizedLimit);
    
    const total = await Post.countDocuments(filter);
    
    res.json({
      posts,
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

// List with filters & search
router.get("/", authOptional, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, tag, author, q, status = "published", sort = "newest" } = req.query;
    const sanitizedLimit = Math.min(parseInt(limit) || 20, 50); // Hard limit max 50
    const filter = {};

    // Determine sort option
    let sortOption = { createdAt: -1 }; // Default newest
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    else if (sort === 'mostViewed') sortOption = { views: -1 };
    else if (sort === 'leastViewed') sortOption = { views: 1 };

    // Get blocked list first
    let blockedIds = [];
    if (req.user) {
      const currentUser = await User.findById(req.user._id).select("blockedUsers").lean();
      blockedIds = (currentUser.blockedUsers || []).map(id => id.toString());
    }

    if (status === "private") {
      if (!req.user) return res.status(401).json({ error: "Cần đăng nhập để xem bài riêng tư" });
      if (author && author !== "undefined" && author !== req.user._id.toString()) {
        return res.status(403).json({ error: "Chỉ có thể xem bài riêng tư của chính mình" });
      }
      filter.status = "private";
      filter.author = req.user._id;
      // Also exclude private posts in groups from Home page
      filter.$and = [
        {
          $or: [
            { group: { $exists: false } },
            { group: null }
          ]
        }
      ];
    } else {
      filter.status = "published";
      // Exclude posts in groups from Home page (only show posts that are not in any group)
      filter.$and = [
        {
          $or: [
            { group: { $exists: false } },
            { group: null }
          ]
        }
      ];
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
      filter.author = author;
    }

    // Apply blocked users filter (IMPORTANT)
    if (blockedIds.length > 0 && status !== "private") {
      // If filtering by specific author, already checked above
      // Otherwise, exclude blocked authors
      if (!author || author === "undefined") {
        filter.author = { $nin: blockedIds };
      }
    }

    if (q) {
      const trimmedQuery = q.trim();
      if (trimmedQuery.length > 0 && trimmedQuery.length <= 100) {
        const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$and.push({
          $or: [
            { title: { $regex: escapedQuery, $options: "i" } },
            { content: { $regex: escapedQuery, $options: "i" } },
            { tags: { $regex: escapedQuery, $options: "i" } }
          ]
        });
      }
    }

    // Add projection to limit fields returned and trim populate (remove blockedUsers heavy array for performance)
    // REMOVED content field to reduce payload size by 80-90% for list/feed endpoints
    // Content will be loaded separately when user clicks to view full post
    const postProjection = {
      title: 1,
      slug: 1,
      tags: 1,
      createdAt: 1,
      author: 1,
      role: 1,
      status: 1,
      views: 1,
      coverUrl: 1,      // Cover image for PostCard
      files: 1,         // Media files (images/videos)
      // content: 1,     // REMOVED: Too heavy for list view, load separately on detail page
      commentCount: 1,  // Denormalized count
      savedCount: 1,    // Denormalized count
      emotes: 1,        // Emotes/reactions
      hasPoll: 1        // Poll indicator
    };

    let query = Post.find(filter, postProjection)
      .populate({
        path: "author",
        select: "name nickname avatarUrl role" // removed blockedUsers to reduce payload
      })
      .populate({
        path: "emotes.user",
        select: "name nickname avatarUrl role"
      })
      .sort(sortOption)
      .lean(); 

    let items = await paginate(query, { page: Number(page), limit: sanitizedLimit }).exec();

    /*
    // Filter posts: remove if either user blocked the other (mutual blocking)
    // REMOVED: Logic moved to Database Query for better performance and pagination
    if (req.user?._id && items.length > 0) {
      const currentUser = await User.findById(req.user._id).select("blockedUsers").lean();
      const currentUserId = req.user._id.toString();
      const blockedSet = new Set((currentUser.blockedUsers || []).map(id => id.toString()));
      
      // Batch fetch all authors' blocked lists
      const authorIds = [...new Set(
        items
          .map(post => post.author?._id?.toString())
          .filter(Boolean)
      )];
      
      const authorsWithBlocked = await User.find({
        _id: { $in: authorIds }
      })
        .select("_id blockedUsers")
        .lean();
      
      // Create a Map for O(1) lookup: authorId -> Set of blocked user IDs
      const authorsBlockedMap = new Map();
      authorsWithBlocked.forEach(author => {
        const authorId = author._id.toString();
        authorsBlockedMap.set(
          authorId,
          new Set((author.blockedUsers || []).map(id => id.toString()))
        );
      });
      
      // Filter posts: remove if either user blocked the other
      items = items.filter(post => {
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
    */

    // Use denormalized counts directly
    const itemsWithCommentCount = items.map(post => ({
      ...post, // PHASE 4: No need for .toObject() since we used .lean()
      commentCount: post.commentCount || 0,
      savedCount: post.savedCount || 0
    }));

    const total = await Post.countDocuments(filter);
    res.json({ items: itemsWithCommentCount, total, page: Number(page), pages: Math.ceil(total / sanitizedLimit) });
  } catch (e) {
    next(e);
  }
});

// Get by slug - Enhanced with isSaved and groupContext
router.get("/slug/:slug", authOptional, async (req, res, next) => {
  try {
    let post = await Post.findOneAndUpdate(
      { slug: req.params.slug, status: "published" },
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate({ path: "author", select: "name nickname avatarUrl role blockedUsers", populate: { path: "role", select: "name displayName iconUrl" } })
      .populate({ path: "emotes.user", select: "name nickname avatarUrl role", populate: { path: "role", select: "name displayName iconUrl" } })
      .populate({ path: "group", select: "name settings members" });

    // If not found, check private
    if (!post) {
      post = await Post.findOneAndUpdate(
        { slug: req.params.slug, status: "private" },
        { $inc: { views: 1 } },
        { new: true }
      )
        .populate({ path: "author", select: "name nickname avatarUrl role blockedUsers", populate: { path: "role", select: "name displayName iconUrl" } })
        .populate({ path: "emotes.user", select: "name nickname avatarUrl role", populate: { path: "role", select: "name displayName iconUrl" } })
        .populate({ path: "group", select: "name settings members" });

      if (post) {
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
    }

    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });

    // Fetch comments and check if saved in parallel
    const [comments, isSaved] = await Promise.all([
      Comment.find({ post: post._id })
        .populate({ path: "author", select: "name nickname avatarUrl role", populate: { path: "role", select: "name displayName iconUrl" } })
        .populate("parent", "_id")
        .sort({ createdAt: -1 }),
      // Check if post is saved by current user
      req.user ?
        User.findById(req.user._id).select("savedPosts").then(user =>
          (user?.savedPosts || []).some(id => id.toString() === post._id.toString())
        ) :
        Promise.resolve(false)
    ]);

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

    const postObject = {
      ...post.toObject(),
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
router.post("/", authRequired, checkBanStatus, async (req, res, next) => {
  try {
    const { title, content, tags = [], coverUrl = "", status = "published", files = [], group = null } = req.body;
    if (!["private", "published"].includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }
    // Sanitize input để chống XSS
    const sanitized = sanitizePostFields({ title, content, tags, coverUrl });

    if (!sanitized.title) {
      return res.status(400).json({ error: "Vui lòng nhập tiêu đề" });
    }

    if ((!sanitized.content || sanitized.content.length === 0) && !req.body.hasPoll) {
      return res.status(400).json({ error: "Vui lòng nhập nội dung hoặc tạo poll" });
    }

    const post = await Post.create({
      author: req.user._id,
      title: sanitized.title, 
      content: sanitized.content || "",
      tags: sanitized.tags || [],
      coverUrl: sanitized.coverUrl || "",
      status,
      files: Array.isArray(files) ? files : [],
      group
    });
    
    // Invalidate cache for this user's posts
    invalidateCache(postCache, `my-posts:${req.user._id.toString()}`);
    invalidateCache(postCache, `posts:`);
    
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
    const { title, content, tags, coverUrl, status, files } = req.body;
    const sanitizedUpdate = sanitizePostFields({ title, content, tags, coverUrl });

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
    if (!["private", "published"].includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }
    post.status = status;
    await post.save();
    
    // Invalidate cache for this user's posts and general posts
    invalidateCache(postCache, `my-posts:${post.author.toString()}`);
    invalidateCache(postCache, `posts:`);
    
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
    
    // Invalidate cache for this user's posts and general posts
    invalidateCache(postCache, `my-posts:${post.author.toString()}`);
    invalidateCache(postCache, `posts:`);
    
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
    if (existed) {
      post.emotes = post.emotes.filter(e => !(e.user.toString() === uid && e.type === emote));
    } else {
      post.emotes = post.emotes.filter(e => e.user.toString() !== uid);
      post.emotes.push({ user: req.user._id, type: emote });
    }

    await post.save();
    await post.populate("emotes.user", "name nickname avatarUrl role");
    res.json({ emotes: post.emotes });
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
    
    // Get all user posts with view counts
    const posts = await Post.find({ 
      author: userId 
    })
    .select('title slug views createdAt status')
    .sort({ createdAt: -1 });
    
    // Calculate total views
    const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
    
    // Get posts from the specified period
    const recentPosts = posts.filter(post => 
      new Date(post.createdAt) >= startDate
    );
    
    // Calculate views by day for the period
    const viewsByDay = {};
    const currentDate = new Date();
    for (let d = new Date(startDate); d <= currentDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      viewsByDay[dateKey] = 0;
    }
    
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
      const emptyResponse = {};
      ids.forEach((id) => {
        emptyResponse[id] = false;
      });
      return res.json(emptyResponse);
    }

    const user = await User.findById(req.user._id).select("savedPosts");
    const savedIds = new Set(
      (user?.savedPosts || []).map((savedId) => savedId.toString())
    );

    const response = {};
    ids.forEach((id) => {
      response[id] = savedIds.has(id);
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Toggle save/unsave a post
router.post("/:id/save", authRequired, async (req, res, next) => {
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
      .populate("author", "name nickname avatarUrl")
      .populate("group", "name")
      .populate({
        path: "emotes.user",
        select: "name nickname avatarUrl role"
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

export default router;
