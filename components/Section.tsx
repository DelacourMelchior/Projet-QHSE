import React from 'react';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  bg?: 'cream' | 'green' | 'beige';
  fullWidth?: boolean;
}

const Section: React.FC<SectionProps> = ({ children, className = '', bg = 'cream', fullWidth = false }) => {
  const bgClass = {
    cream: 'bg-sb-cream text-sb-black',
    green: 'bg-sb-green-dark text-sb-cream',
    beige: 'bg-sb-beige text-sb-black'
  }[bg];

  return (
    <section className={`${bgClass} ${className}`}>
      <div className={fullWidth ? '' : 'container mx-auto px-6 py-16 md:py-24'}>
        {children}
      </div>
    </section>
  );
};

export default Section;