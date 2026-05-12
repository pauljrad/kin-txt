import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { updateKidAvatar } from '@/lib/kidAuth';
import { useKidAuth } from '@/hooks/useKidAuth';

const COLOURS = [
  '#E74C3C', '#E67E22', '#F1C40F', '#2ECC71',
  '#3498DB', '#9B59B6', '#1ABC9C', '#2C3E50',
  '#ECF0F1', '#ffffff',
];
const SIZES = [4, 8, 14, 22];

interface AvatarCanvasProps {
  onClose: () => void;
}

export function AvatarCanvas({ onClose }: AvatarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [colour, setColour] = useState('#2C3E50');
  const [size, setSize] = useState(8);
  const [isEraser, setIsEraser] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const { updateAvatar } = useKidAuth();

  // Fill background on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff8f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPos.current) return;

    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = isEraser ? '#fff8f0' : colour;
    ctx.lineWidth = isEraser ? size * 3 : size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  }, [drawing, colour, size, isEraser]);

  const endDraw = useCallback(() => {
    setDrawing(false);
    lastPos.current = null;
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff8f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveAvatar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    updateKidAvatar(dataUrl);
    updateAvatar(dataUrl);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 200,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '16px', gap: '16px', overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ width: '100%', maxWidth: '520px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)' }}>
          Draw Your Avatar!
        </h2>
        <button onClick={onClose} className="kid-btn kid-btn-ghost" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
          Close
        </button>
      </div>

      {/* Canvas */}
      <div className="kid-card" style={{ padding: '8px', width: '100%', maxWidth: '520px' }}>
        <canvas
          ref={canvasRef}
          width={480}
          height={480}
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: '14px',
            cursor: isEraser ? 'cell' : 'crosshair',
            touchAction: 'none',
            display: 'block',
          }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>

      {/* Colour picker */}
      <div className="kid-card" style={{ padding: '16px 20px', width: '100%', maxWidth: '520px' }}>
        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Choose a colour</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {COLOURS.map(c => (
            <button
              key={c}
              onClick={() => { setColour(c); setIsEraser(false); }}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: c,
                border: `3px solid ${colour === c && !isEraser ? '#333' : 'var(--border)'}`,
                cursor: 'pointer',
                transform: colour === c && !isEraser ? 'scale(1.2)' : 'scale(1)',
                transition: 'transform 0.15s, border-color 0.15s',
                boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #ccc' : 'none',
              }}
              aria-label={c}
            />
          ))}
          {/* Eraser */}
          <button
            onClick={() => setIsEraser(true)}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg)', fontSize: '1.1rem',
              border: `3px solid ${isEraser ? '#333' : 'var(--border)'}`,
              cursor: 'pointer',
              transform: isEraser ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.15s, border-color 0.15s',
            }}
            aria-label="Eraser"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
              <path d="m22 21H7" />
              <path d="m5 11 9 9" />
            </svg>
          </button>
        </div>

        {/* Size picker */}
        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', margin: '14px 0 10px' }}>Brush size</p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {SIZES.map(s => (
            <button
              key={s}
              onClick={() => setSize(s)}
              style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'var(--bg)', border: `3px solid ${size === s ? '#333' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'border-color 0.15s',
              }}
            >
              <div style={{
                width: `${s + 2}px`, height: `${s + 2}px`, borderRadius: '50%',
                background: isEraser ? 'var(--text-muted)' : colour,
              }} />
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '520px' }}>
        <button onClick={clearCanvas} className="kid-btn kid-btn-ghost" style={{ flex: 1 }}>
          Clear
        </button>
        <button onClick={saveAvatar} className="kid-btn kid-btn-primary" style={{ flex: 2 }}>
          Save Avatar!
        </button>
      </div>
    </motion.div>
  );
}
