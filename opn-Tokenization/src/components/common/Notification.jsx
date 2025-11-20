// src/components/common/Notification.jsx
import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

const Notification = () => {
  const { notification } = useApp();

  if (!notification) return null;

  // Icon based on type
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className={`fixed bottom-6 left-6 z-50 animate-slideUp max-w-md ${
      notification.type === 'success' 
        ? 'bg-gradient-to-r from-neutral-900 to-black border border-neutral-800'
        : notification.type === 'error'
        ? 'bg-gradient-to-r from-neutral-900 to-black border border-red-900/50'
        : 'bg-gradient-to-r from-neutral-900 to-black border border-blue-900/50'
    } rounded-xl shadow-2xl backdrop-blur-sm`}>
      <div className="px-4 py-3 flex items-center gap-3">
        {getIcon()}
        <p className={`text-sm font-normal flex-1 ${
          notification.type === 'success' ? 'text-white' : 
          notification.type === 'error' ? 'text-red-400' : 
          'text-blue-400'
        }`}>
          {notification.message}
        </p>
      </div>
    </div>
  );
};

export default Notification;