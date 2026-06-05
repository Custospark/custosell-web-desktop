import logo from './custosell-logo.png';

interface LogoImageProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = { sm: 'h-7', md: 'h-9', lg: 'h-12' };

export default function LogoImage({ className = '', size = 'md' }: LogoImageProps) {
  return (
    <img
      src={logo}
      alt="Custosell"
      className={`${sizeClasses[size]} w-auto cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 ${className}`}
      title="Custosell"
      aria-label="Custosell Logo"
    />
  );
}
