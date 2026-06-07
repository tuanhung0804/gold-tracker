'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { submitPin } from '@/actions/auth';
import { AlertCircle, Loader2 } from 'lucide-react';
import styles from './page.module.css';
import galleryImages from './gallery.json';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState<string[]>(galleryImages);
  const [randomImage, setRandomImage] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Gallery images with captions dynamically generated from state
  const GALLERY_MEMORIES = images.map((filename) => ({
    filename,
    caption: "Kỷ niệm"
  }));

  // Screen size check to prevent timer execution on mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkWidth = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Slideshow interval (auto next every 10s, only on desktop)
  useEffect(() => {
    if (!isDesktop) return;
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % GALLERY_MEMORIES.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [isDesktop, GALLERY_MEMORIES.length]);

  // Load random Polaroid image client-side to avoid hydration mismatches
  useEffect(() => {
    if (images.length === 0) return;
    const N = images.length;
    const I = Math.floor(Math.random() * N);
    const filename = images[I];
    setRandomImage(`/api/gallery/image?name=${filename}`);
  }, [images]);

  // Fetch dynamic GCS images on mount
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch('/api/gallery');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setImages(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch GCS images:', err);
      }
    };
    fetchImages();
  }, []);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPending) return;
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 4) {
      setError('');
      setPin(val);
    }
  };

  const handleSubmit = () => {
    if (pin.length !== 4 || isPending) return;
    
    startTransition(async () => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('justLoggedIn', 'true');
      }
      const res = await submitPin(pin);
      if (res && res.error) {
        setError(res.error);
        setPin(''); // Reset PIN on error
        if (inputRef.current) inputRef.current.focus();
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('justLoggedIn');
        }
      } else if (res && res.success) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pin_verified', 'true');
        }
        if (res.role === 'admin') {
          router.push('/admin/lockouts');
        } else {
          router.push('/price');
        }
      }
    });
  };

  // Helper to determine the CSS class based on distance to active slide (cyclic diff)
  const getSlideClass = (index: number) => {
    const N = GALLERY_MEMORIES.length;
    let diff = index - currentImageIndex;
    
    if (diff < -N / 2) diff += N;
    if (diff > N / 2) diff -= N;

    if (diff === 0) return styles.slideActive;
    if (diff === 1) return styles.slideNext;
    if (diff === -1) return styles.slidePrev;
    if (diff > 1) return styles.slideFarNext;
    if (diff < -1) return styles.slideFarPrev;
    return styles.slideHidden;
  };

  return (
    <div className={styles.loginPageWrapper}>
      {/* Page corner ribbon decoration */}
      <img 
        src="/assets/ribbon-corner.png" 
        alt="Ribbon Corner Accent" 
        className={styles.pageRibbonCorner} 
      />

      {/* Central rounded glassmorphic card */}
      <div className={styles.mainLoginCard}>
        {/* Left Column: cylinder push slideshow (desktop-only via css display rules) */}
        <div className={styles.slideshowColumn}>
          {/* Floating Hearts for Desktop (outside overflow hidden wrapper) */}
          <div className={styles.desktopHeartsContainer}>
            <div className={`${styles.heart} ${styles.heart1}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart2}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart3}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart4}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart5}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart6}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart7}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart8}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart9}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart10}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart11}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart12}`}>♥</div>
          </div>
          <div className={styles.slideshowWrapper}>
            {GALLERY_MEMORIES.map((memory, index) => {
              const slideClass = getSlideClass(index);
              return (
                <img 
                  key={memory.filename} 
                  src={`/api/gallery/image?name=${memory.filename}`} 
                  alt={memory.caption}
                  className={`${styles.slideshowImage} ${slideClass}`}
                  loading="eager"
                />
              );
            })}
          </div>
        </div>

        {/* Right Column: Title, subheadline, inputs */}
        <div className={styles.formColumn}>
          {/* Mobile-only singular polaroid frame */}
          <div className={styles.polaroidFrame}>
            {/* Floating Hearts for Mobile */}
            <div className={`${styles.heart} ${styles.heart1}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart2}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart3}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart4}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart5}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart6}`}>♥</div>
            <div className={`${styles.heart} ${styles.heart7}`}>♥</div>
            <div className={styles.polaroidWrapper}>
              {randomImage && (
                <img 
                  src={randomImage} 
                  alt="Memory Photo" 
                  className={`${styles.polaroidImage} ${imageLoaded ? styles.imageVisible : ''}`}
                  onLoad={() => setImageLoaded(true)}
                />
              )}
            </div>
          </div>

          <h1 className={`heading-gradient ${styles.siteTitle}`}>Sổ vàng của bé Linh</h1>
          <h2 className={styles.subHeadline}>Xác thực bé Linh của anh Hưng</h2>

          {error && (
            <div className={styles.errorBox}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <p>{error}</p>
            </div>
          )}

          <div className={styles.pinContainer}>
            <input 
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={handleChange}
              disabled={isPending}
              className={styles.hiddenInput}
              autoComplete="off"
              autoFocus
            />
            {[0, 1, 2, 3].map((i) => {
              const isCurrent = pin.length === i;
              const isFilled = pin.length > i;
              
              let boxClass = styles.pinBox;
              if (isCurrent) boxClass += ` ${styles.pinBoxActive}`;
              else if (isFilled) boxClass += ` ${styles.pinBoxFilled}`;
              
              return (
                <div key={i} className={boxClass}>
                  {isFilled ? (
                    <div className={styles.dot}></div>
                  ) : (
                    isCurrent && <div className={styles.cursor}></div>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.loadingBox}>
            {isPending && (
              <>
                <Loader2 className={styles.spin} size={20} />
                <span>Đang kiểm tra...</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
