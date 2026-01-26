import React from 'react';

interface PageContainerProps {
    children: React.ReactNode;
    className?: string; // Allow custom classes like gradients
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, className = "" }) => {
    return (
        <div className={`min-h-[calc(100vh-80px)] w-full max-w-7xl mx-auto p-4 lg:p-8 space-y-6 ${className}`}>
            {children}
        </div>
    );
};
