import React from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    icon?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, icon }) => {
    return (
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/50 -mx-4 px-4 py-4 lg:-mx-8 lg:px-8 mb-6 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {icon && <div className="p-2 bg-gray-100 rounded-lg text-gray-700">{icon}</div>}
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 tracking-tight">{title}</h1>
                        {subtitle && <p className="text-sm font-medium text-gray-500">{subtitle}</p>}
                    </div>
                </div>

                {actions && (
                    <div className="flex items-center gap-2 self-stretch md:self-auto">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
};
