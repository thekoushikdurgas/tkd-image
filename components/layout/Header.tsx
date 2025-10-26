import React from 'react';
import { User } from '@supabase/supabase-js';

interface HeaderProps {
  user: User;
  onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onSignOut }) => {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
      <div className="text-center sm:text-left">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
          AI Image Stylizer
        </h1>
        <p className="mt-2 text-lg text-text-secondary">
          Analyze, edit, and transform your photos with the power of generative AI.
        </p>
      </div>
      <div className="flex items-center gap-4 bg-card-bg p-2 rounded-full shadow-lg">
        {user.user_metadata.avatar_url ? (
          <img src={user.user_metadata.avatar_url} alt="User" className="w-10 h-10 rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-lg">
            {user.email ? user.email.charAt(0).toUpperCase() : '?'}
          </div>
        )}
        <span className="font-semibold text-text hidden md:block max-w-[150px] truncate">
          {user.user_metadata.full_name || user.email}
        </span>
        <button
          onClick={onSignOut}
          className="px-4 py-2 bg-border-color text-text font-semibold rounded-full hover:bg-gray-700 transition"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
};

export default Header;
