'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const verified = sessionStorage.getItem('pin_verified') === 'true';
      setIsVerified(verified);
      
      if (verified && pathname !== '/login') {
        document.body.classList.add('post-login-bg');
      } else {
        document.body.classList.remove('post-login-bg');
      }
    }
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/login') return;

    const syncActiveTab = () => {
      const hash = window.location.hash;
      if (hash === '#portfolio') {
        setActiveTab('portfolio');
      } else if (hash === '#history') {
        setActiveTab('history');
      } else {
        setActiveTab('overview');
      }
    };

    syncActiveTab();

    // Listen to browser hash changes (e.g. click tabs or manual history jumps)
    window.addEventListener('hashchange', syncActiveTab);
    return () => window.removeEventListener('hashchange', syncActiveTab);
  }, [pathname]);

  if (pathname === '/login' || !isVerified) return null;

  const handleTabClick = (e: React.MouseEvent, tabHash: string) => {
    e.preventDefault();
    if (pathname === '/price') {
      window.location.hash = tabHash;
    } else {
      router.push('/price' + (tabHash ? '#' + tabHash : ''));
    }
  };

  const getLinkStyle = (tabName: string) => {
    const isActive = activeTab === tabName;
    return {
      color: isActive ? 'var(--gold-primary)' : 'var(--text-secondary)',
      transition: 'all 0.2s ease',
      fontWeight: isActive ? 600 : 500,
      textShadow: isActive ? '0 0 8px var(--gold-glow)' : 'none',
      position: 'relative' as const,
      paddingBottom: '4px',
      borderBottom: isActive ? '2px solid var(--gold-primary)' : '2px solid transparent',
    };
  };

  return (
    <nav style={{ padding: '20px 0', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)', backdropFilter: 'var(--backdrop-blur)' }}>
      <div className="navbar-container container">
        <a href="#" onClick={(e) => handleTabClick(e, '')}>
          <h1 className="heading-gradient" style={{ fontSize: '1.5rem', margin: 0, cursor: 'pointer', textShadow: '0 0 10px var(--gold-glow)' }}>
            Sổ vàng của bé Linh
          </h1>
        </a>
        <div className="navbar-links">
          <a href="#" onClick={(e) => handleTabClick(e, '')} style={getLinkStyle('overview')}>
            Giá vàng
          </a>
          <a href="#portfolio" onClick={(e) => handleTabClick(e, 'portfolio')} style={getLinkStyle('portfolio')}>
            Hũ vàng
          </a>
          <a href="#history" onClick={(e) => handleTabClick(e, 'history')} style={getLinkStyle('history')}>
            Lịch sử
          </a>
        </div>
      </div>
    </nav>
  );
}
