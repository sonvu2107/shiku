import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GroupCreator from '../components/GroupCreator';
import { PageLayout } from '../components/ui/DesignSystem';

/**
 * CreateGroup Page - Trang tạo nhóm mới (Monochrome Luxury Style)
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
    // Navigate to group detail page
    navigate(`/groups/${group._id}`);
  };

  return (
    <PageLayout>
      <GroupCreator
        isOpen={isCreatorOpen}
        onClose={handleCreatorClose}
        onSuccess={handleCreatorSuccess}
      />
    </PageLayout>
  );
};

export default CreateGroup;
