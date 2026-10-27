import React from 'react';
import { XIcon } from './Icons';

const widthClasses = {
  '560px': 'max-w-[560px]',
  '620px': 'max-w-[620px]',
  '640px': 'max-w-[640px]',
  '680px': 'max-w-[680px]',
  '920px': 'max-w-[920px]',
  '1100px': 'max-w-[1100px]'
} as const;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: keyof typeof widthClasses;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '560px'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 [background:rgba(15,_23,_42,_0.45)] flex items-center justify-center z-[1000] [backdrop-filter:blur(3px)] p-4">
      <div
        className={[
          'bg-[#ffffff] rounded-xl w-full',
          widthClasses[maxWidth],
          'max-h-[90vh] overflow-y-auto shadow-[0_20px_25px_-5px_rgba(0,_0,_0,_0.1),_0_8px_10px_-6px_rgba(0,_0,_0,_0.05)] [border:1px_solid_#e2e8f0] p-7'
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="flex justify-between items-center [border-bottom:1px_solid_#f1f5f9] pb-4 mb-5">
          <h3 className="m-0 text-[1.15rem] text-[#0f172a] font-bold">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="bg-[#f8fafc] [border:1px_solid_#e2e8f0] cursor-pointer text-[#64748b] p-[0.35rem] rounded-md flex items-center justify-center hover:bg-[#f1f5f9] hover:text-[#0f172a]"
          >
            <XIcon size={16} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};
