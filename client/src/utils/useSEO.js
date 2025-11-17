import { useEffect } from 'react';

/**
 * Hook để quản lý SEO meta tags động cho các trang React
 * @param {Object} options - Các tùy chọn SEO
 * @param {string} options.title - Tiêu đề trang
 * @param {string} options.description - Mô tả trang
 * @param {string} options.robots - Robots meta (mặc định: "index, follow")
 * @param {string} options.canonical - Canonical URL
 */
export function useSEO({ title, description, robots = 'index, follow', canonical }) {
  useEffect(() => {
    // Update document title
    if (title) {
      const originalTitle = document.title;
      document.title = title;
      
      return () => {
        document.title = originalTitle;
      };
    }
  }, [title]);

  useEffect(() => {
    // Update meta description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      
      const originalContent = metaDescription.getAttribute('content');
      metaDescription.setAttribute('content', description);
      
      return () => {
        if (originalContent) {
          metaDescription.setAttribute('content', originalContent);
        }
      };
    }
  }, [description]);

  useEffect(() => {
    // Update robots meta
    if (robots) {
      let metaRobots = document.querySelector('meta[name="robots"]');
      
      if (!metaRobots) {
        metaRobots = document.createElement('meta');
        metaRobots.setAttribute('name', 'robots');
        document.head.appendChild(metaRobots);
      }
      
      const originalContent = metaRobots.getAttribute('content');
      metaRobots.setAttribute('content', robots);
      
      return () => {
        if (originalContent) {
          metaRobots.setAttribute('content', originalContent);
        }
      };
    }
  }, [robots]);

  useEffect(() => {
    // Update canonical URL
    if (canonical) {
      let linkCanonical = document.querySelector('link[rel="canonical"]');
      
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        document.head.appendChild(linkCanonical);
      }
      
      const originalHref = linkCanonical.getAttribute('href');
      linkCanonical.setAttribute('href', canonical);
      
      return () => {
        if (originalHref) {
          linkCanonical.setAttribute('href', originalHref);
        }
      };
    }
  }, [canonical]);
}

