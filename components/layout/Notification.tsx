import React from 'react';
import { Notification as NotificationType } from '../../types';

interface NotificationProps {
  notification: NotificationType | null;
}

const Notification: React.FC<NotificationProps> = ({ notification }) => {
  if (!notification) return null;

  return (
    <div className={`fixed bottom-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-fade-in ${
      notification.type === 'success' ? 'bg-success text-background' : 'bg-red-600'
    }`} role="status">
      {notification.message}
    </div>
  );
};

export default Notification;
