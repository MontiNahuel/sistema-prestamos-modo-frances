import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from './Icons';

const widthClasses = {
  '560px': 'max-w-[560px]',
  '620px': 'max-w-[620px]',
  '640px': 'max-w-[640px]',
  '680px': 'max-w-[680px]',
  '920px': 'max-w-[920px]',
  '1100px': 'max-w-[1100px]',
  '1440px': 'w-[96vw] max-w-[1440px]'
} as const;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: keyof typeof widthClasses;
  layout?: 'default' | 'workspace';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '560px',
  layout = 'default'
}) => {
  const isWorkspace = layout === 'workspace';
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || !isWorkspace) return;
    const actualizarTop = () => {
      const header = document.querySelector('header');
      const bottom = header
        ? Math.max(0, Math.round(header.getBoundingClientRect().bottom))
        : 64;
      if (overlayRef.current) {
        overlayRef.current.style.top = `${bottom}px`;
      }
    };
    actualizarTop();
    window.addEventListener('resize', actualizarTop);
    return () => window.removeEventListener('resize', actualizarTop);
  }, [isOpen, isWorkspace]);

  if (!isOpen) return null;

  const contenido = (
    <div
      ref={overlayRef}
      className={[
        'fixed inset-x-0 bottom-0 [background:rgba(15,_23,_42,_0.45)] flex items-center justify-center [backdrop-filter:blur(3px)]',
        isWorkspace ? 'top-[64px] z-[40] p-4' : 'top-0 z-[1000] p-4'
      ].join(' ')}
    >
      <div
        className={[
          'bg-[#ffffff] text-[#0f172a] [color-scheme:light] rounded-xl w-full',
          widthClasses[maxWidth],
          isWorkspace
            ? 'h-full max-h-full flex flex-col overflow-hidden p-0'
            : 'max-h-[90vh] overflow-y-auto p-7',
          'shadow-[0_20px_25px_-5px_rgba(0,_0,_0,_0.1),_0_8px_10px_-6px_rgba(0,_0,_0,_0.05)] [border:1px_solid_#e2e8f0]'
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div
          className={[
            'flex justify-between items-center [border-bottom:1px_solid_#e2e8f0]',
            isWorkspace ? 'px-6 py-3 flex-shrink-0' : 'pb-4 mb-5'
          ].join(' ')}
        >
          <h3 className="m-0 text-[1.08rem] text-[#0f172a] font-bold">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="bg-[#f8fafc] [border:1px_solid_#e2e8f0] cursor-pointer text-[#64748b] p-[0.35rem] rounded-md flex items-center justify-center hover:bg-[#f1f5f9] hover:text-[#0f172a]"
          >
            <XIcon size={16} />
          </button>
        </div>

        {isWorkspace ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(contenido, document.body);
  }
  return contenido;
};
