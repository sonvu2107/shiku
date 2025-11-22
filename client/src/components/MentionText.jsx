import React from "react";
import { useNavigate } from "react-router-dom";
import { renderMentions } from "../utils/mentions";

/**
 * MentionText - Component to render text with @mentions as clickable links
 * @param {string} text - The text content
 * @param {Array} mentionedUsers - Array of user objects with _id, name, avatarUrl
 */
export default function MentionText({ text, mentionedUsers = [] }) {
  const navigate = useNavigate();

  const handleMentionClick = (user) => {
    if (user && user._id) {
      navigate(`/user/${user._id}`);
    }
  };

  if (!text) return null;

  return (
    <span>
      {renderMentions(text, mentionedUsers, handleMentionClick)}
    </span>
  );
}

