import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GroupCreator from '../components/GroupCreator';

/**
 * CreateGroup Page - Trang tạo nhóm mới
 * Sử dụng GroupCreator component trong full-screen mode
 */
const CreateGroup = () => {
  const navigate = useNavigate();
  const [isCreatorOpen, setIsCreatorOpen] = useState(true);

  // Handle creator close
  const handleCreatorClose = () => {
    setIsCreatorOpen(false);
    navigate('/groups');
  };

  // Handle creator success
  const handleCreatorSuccess = (group) => {
    console.log('Group created successfully:', group);
    // Navigate to group detail page
    navigate(`/groups/${group._id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GroupCreator
        isOpen={isCreatorOpen}
        onClose={handleCreatorClose}
        onSuccess={handleCreatorSuccess}
      />
    </div>
  );
};

export default CreateGroup;
