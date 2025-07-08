
import React from 'react';

interface SettingsHeaderProps {
  title: string;
  description: string;
}

export const SettingsHeader = ({ title, description }: SettingsHeaderProps) => {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
      <p className="text-gray-600 dark:text-gray-400 mt-2">{description}</p>
    </div>
  );
};
