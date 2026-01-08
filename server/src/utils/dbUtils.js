/**
 * Database Utility Functions
 * Shared helpers for Mongoose operations with retry logic
 */

/**
 * Save document with retry on VersionError
 * Handles optimistic concurrency conflicts by reloading and merging
 * 
 * @param {Document} doc - Mongoose document to save
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise<Document>} Saved document
 */
export async function saveWithRetry(doc, maxRetries = 3) {
    let currentDoc = doc;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await currentDoc.save();
            return currentDoc;
        } catch (error) {
            if (error.name === 'VersionError' && attempt < maxRetries) {
                // Reload document and retry
                const freshDoc = await currentDoc.constructor.findById(currentDoc._id);
                if (freshDoc) {
                    // Copy modified paths to fresh doc
                    const modifiedPaths = currentDoc.modifiedPaths();
                    for (const path of modifiedPaths) {
                        try {
                            freshDoc.set(path, currentDoc.get(path));
                        } catch {
                            // Skip paths that can't be set (nested/complex paths)
                        }
                    }
                    currentDoc = freshDoc;
                    console.log(`[DB] VersionError retry ${attempt}/${maxRetries} for ${currentDoc._id}`);
                    continue;
                }
            }
            throw error;
        }
    }
    return currentDoc;
}

/**
 * Execute a function with retry on VersionError
 * Useful when you need to reload and re-execute entire logic
 * 
 * @param {Function} fn - Async function to execute
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise<any>} Result of the function
 */
export async function withRetry(fn, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (error.name === 'VersionError' && attempt < maxRetries) {
                console.log(`[DB] VersionError, retrying ${attempt}/${maxRetries}`);
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

export default { saveWithRetry, withRetry };
