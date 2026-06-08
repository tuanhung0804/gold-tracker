'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardClient from './DashboardClient';
import PortfolioContent from './PortfolioContent';
import HistoryContent from './HistoryContent';
import { getMessage } from '@/actions/auth';

interface GiaVangPriceInfo {
  name: string;
  buyPrice: number;
  sellPrice: number;
  alterBuy: number;
  alterSell: number;
  yesterdayBuy: number;
  yesterdaySell: number;
}

interface LivePrice {
  name: string;
  buyPrice: number;
  sellPrice: number;
  sjcRing: GiaVangPriceInfo | null;
  worldGold: GiaVangPriceInfo | null;
}

interface PortfolioItem {
  id: number;
  buyDate: string | Date;
  quantity: number;
  buyPrice: number;
  status: string;
}

interface TabSliderProps {
  initialLivePrice: LivePrice | null;
  initialPortfolio: PortfolioItem[];
}

export default function TabSlider({ initialLivePrice, initialPortfolio }: TabSliderProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [message, setMessage] = useState("Anh xin lỗi bé nhiều nhiều. Em yêu mau hết cáu anh nha. Anh yêu em nhiều ❤️");

  // Fetch the message from the backend on mount
  useEffect(() => {
    getMessage().then((msg) => {
      if (msg) setMessage(msg);
    });
  }, []);

  const router = useRouter();

  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const isValidDrag = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 0. Verify PIN verification state
  useEffect(() => {
    const verified = sessionStorage.getItem('pin_verified') === 'true';
    if (!verified) {
      router.replace('/login');
    } else {
      setIsVerified(true);
    }
  }, [router]);

  // 1. Sync from URL hash (/#portfolio, /#history) to activeTab state
  useEffect(() => {
    const syncHashTab = () => {
      const hash = window.location.hash;
      if (hash === '#portfolio') {
        setActiveTab(1);
      } else if (hash === '#history') {
        setActiveTab(2);
      } else {
        setActiveTab(0);
      }
    };

    syncHashTab();

    window.addEventListener('hashchange', syncHashTab);
    return () => window.removeEventListener('hashchange', syncHashTab);
  }, []);

  // 2. Programmatically update URL address bar using hash (no page refresh or server hits)
  const updateTabHash = (index: number) => {
    const hashName = index === 1 ? '#portfolio' : index === 2 ? '#history' : '';
    
    // Changing hash triggers hashchange event, syncing the Navbar and Slider state instantly
    window.location.hash = hashName;
    setActiveTab(index);
  };

  useEffect(() => {
    const handleStart = (clientX: number, clientY: number, target: HTMLElement) => {
      let current: HTMLElement | null = target;
      let shouldIgnore = false;

      while (current && current !== document.body) {
        const tagName = current.tagName.toLowerCase();
        
        // Block swipes starting on charts, interactive controls, inputs, or horizontal tables
        if (
          tagName === 'input' ||
          tagName === 'button' ||
          tagName === 'textarea' ||
          tagName === 'select' ||
          tagName === 'a' ||
          current.classList.contains('recharts-responsive-container') ||
          current.classList.contains('premium-table') ||
          current.getAttribute('data-no-swipe') === 'true'
        ) {
          shouldIgnore = true;
          break;
        }

        // Block swipe on elements configured with horizontal scrollbars
        const style = window.getComputedStyle(current);
        if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
          if (current.scrollWidth > current.clientWidth) {
            shouldIgnore = true;
            break;
          }
        }

        current = current.parentElement;
      }

      if (shouldIgnore) {
        isValidDrag.current = false;
        return;
      }

      isValidDrag.current = true;
      startX.current = clientX;
      startY.current = clientY;
      startTime.current = Date.now();
      setIsDragging(true);
      setDragOffset(0);
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!isValidDrag.current) return;

      const deltaX = clientX - startX.current;
      const deltaY = clientY - startY.current;

      // Ignore diagonal drags that are mostly vertical scroll actions
      if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5 && Math.abs(deltaY) > 20) {
        isValidDrag.current = false;
        setIsDragging(false);
        setDragOffset(0);
        return;
      }

      // Rubber-banding resistance on screen borders
      let finalOffset = deltaX;
      if (activeTab === 0 && deltaX > 0) {
        finalOffset = deltaX * 0.3;
      } else if (activeTab === 2 && deltaX < 0) {
        finalOffset = deltaX * 0.3;
      }

      setDragOffset(finalOffset);
    };

    const handleEnd = (clientX: number) => {
      if (!isValidDrag.current) return;
      isValidDrag.current = false;
      setIsDragging(false);

      const deltaX = clientX - startX.current;
      const timeDiff = Date.now() - startTime.current;
      const screenWidth = window.innerWidth;

      const isFlick = timeDiff < 250 && Math.abs(deltaX) > 55;
      const isLargeDrag = Math.abs(deltaX) > screenWidth * 0.22;

      if (isFlick || isLargeDrag) {
        if (deltaX < 0 && activeTab < 2) {
          updateTabHash(activeTab + 1);
        } else if (deltaX > 0 && activeTab > 0) {
          updateTabHash(activeTab - 1);
        } else {
          setDragOffset(0);
        }
      } else {
        setDragOffset(0);
      }
    };

    // 1. Touch Events
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY, e.target as HTMLElement);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isValidDrag.current) return;
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) return;
      const touch = e.changedTouches[0];
      handleEnd(touch.clientX);
    };

    // 2. Mouse Events (Desktop click & drag testing support)
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only primary clicks
      handleStart(e.clientX, e.clientY, e.target as HTMLElement);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isValidDrag.current) return;
      handleMove(e.clientX, e.clientY);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging) return;
      handleEnd(e.clientX);
    };

    const handleDragStart = (e: DragEvent) => {
      let current = e.target as HTMLElement | null;
      while (current && current !== document.body) {
        if (current.tagName.toLowerCase() === 'a' || current.tagName.toLowerCase() === 'button') {
          return;
        }
        current = current.parentElement;
      }
      e.preventDefault();
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', () => { isValidDrag.current = false; setIsDragging(false); }, { passive: true });

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);

      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('dragstart', handleDragStart);
    };
  }, [activeTab, isDragging]);

  const containerStyle = {
    display: 'flex',
    width: '300vw',
    transform: isDragging
      ? `translateX(calc(-${activeTab * 100}vw + ${dragOffset}px))`
      : `translateX(-${activeTab * 100}vw)`,
    transition: isDragging ? 'none' : 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: 'transform',
  };

  if (!isVerified) return null;

  return (
    <div style={{ width: '100%', overflow: 'hidden', minHeight: 'calc(100vh - 80px)' }} ref={containerRef}>
      <div style={containerStyle}>
        {/* Slide 0: Dashboard (Overview) */}
        <div style={{ width: '100vw', flexShrink: 0, minHeight: '100%' }}>
          <DashboardClient initialLivePrice={initialLivePrice} initialPortfolio={initialPortfolio} />
        </div>

        {/* Slide 1: Portfolio (Hũ vàng của bé Linh) */}
        <div style={{ width: '100vw', flexShrink: 0, minHeight: '100%' }}>
          <PortfolioContent />
        </div>

        {/* Slide 2: History (Lịch sử) */}
        <div style={{ width: '100vw', flexShrink: 0, minHeight: '100%' }}>
          <HistoryContent />
        </div>
      </div>

      {/* Floating Message Button */}
      <button 
        className="floating-message-btn" 
        onClick={() => setShowMessageDialog(true)}
        aria-label="Tin nhắn gửi bé"
      >
        <img 
          src="/assets/message-icon.png" 
          alt="Tin nhắn gửi bé" 
          className="floating-message-img" 
        />
      </button>

      {/* Message Dialog */}
      {showMessageDialog && (
        <div className="message-modal-overlay" onClick={() => setShowMessageDialog(false)}>
          <div className="message-modal-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src="/assets/message-icon.png" 
              alt="Message" 
              className="message-modal-icon" 
            />
            <p className="message-modal-text">
              {message}
            </p>
            <button className="message-modal-close-btn" onClick={() => setShowMessageDialog(false)}>
              OK anh yêu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
