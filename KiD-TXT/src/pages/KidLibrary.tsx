import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useKidAuth } from '@/hooks/useKidAuth';
import { ThemeSelector } from '@/components/ThemeSelector';

// The only book for KiD-TXT
const JUNGLE_BOOK = {
  id: 'the-jungle-book',
  title: 'The Jungle Book',
  author: 'Rudyard Kipling',
  cover: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=400',
  description: 'Follow the adventures of Mowgli, the boy raised by wolves, and his friends Baloo the bear and Bagheera the panther.',
  file: '/books/jungle-book.txt' // We will assume there's a text file or we can hardcode the parsed text source
};

export default function KidLibrary() {
  const { kid } = useKidAuth();
  const navigate = useNavigate();

  if (!kid) return null;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '24px' }}>
      
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        
        {/* Left: Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            onClick={() => navigate('/profile')}
            style={{ 
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'var(--bg-card)', border: '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden', flexShrink: 0
            }}
          >
            {kid.avatarData ? (
              <img src={kid.avatarData} alt="Me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Profile</span>
            )}
          </div>
          <div>
            <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>
              Hi, {kid.name}!
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Ready to read?</div>
          </div>
        </div>

        {/* Right: Theme Selector */}
        <div style={{ flexShrink: 0 }}>
          <ThemeSelector />
        </div>
      </div>

      {/* Main App Logo */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '3.2rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
          KiD-TXT
        </h1>
      </div>

      <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '24px', textAlign: 'center' }}>
        My Bookshelf
      </h2>

      {/* Book List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '500px', margin: '0 auto' }}>
        
        <motion.div 
          className="kid-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ height: '160px', width: '100%', position: 'relative' }}>
            <img 
              src={JUNGLE_BOOK.cover} 
              alt={JUNGLE_BOOK.title} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ 
              position: 'absolute', top: '10px', right: '10px', 
              background: 'var(--accent)', color: 'var(--accent-text)', 
              padding: '6px 12px', borderRadius: '20px', 
              fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: '0.9rem' 
            }}>
              NEW!
            </div>
          </div>
          
          <div style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
              {JUNGLE_BOOK.title}
            </h3>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '16px' }}>
              by {JUNGLE_BOOK.author}
            </p>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', marginBottom: '24px', lineHeight: 1.4 }}>
              {JUNGLE_BOOK.description}
            </p>
            
            <button 
              onClick={() => navigate('/read/jungle-book')}
              className="kid-btn kid-btn-primary" 
              style={{ width: '100%' }}
            >
              READ NOW!
            </button>
          </div>
        </motion.div>

      </div>

    </div>
  );
}
