import { sanitizePostFields } from "../src/routes/posts.js";

describe("Post sanitization helpers", () => {
  it("strips script tags from content", () => {
    const { content } = sanitizePostFields({
      content: "<script>alert(1)</script><p>allowed</p>"
    });

    expect(content).toContain("<p>allowed</p>");
    expect(content).not.toContain("<script>");
  });

  it("normalizes tags to max 10 items and 20 chars", () => {
    const tags = Array.from({ length: 15 }, (_, idx) => ` tag-${idx} `.repeat(5));
    const { tags: sanitized } = sanitizePostFields({ tags });

    expect(sanitized).toHaveLength(10);
    sanitized.forEach((tag) => {
      expect(tag.length).toBeLessThanOrEqual(20);
      expect(tag).not.toMatch(/\s$/);
    });
  });
});
