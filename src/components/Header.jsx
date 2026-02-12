import { useState } from 'react';
import { useCourseData } from '../hooks/useCourseData';
import { EDIT_MODE } from '../config';

export default function Header({ onOpenImport }) {
  const { data, dirty, downloadYaml, copyYaml, revert } = useCourseData();
  const course = data.course || {};
  const layers = data.layers || [];
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    copyYaml().then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: course.theme_color || '#14b8a6' }}
        />
        <span className="text-[0.82rem] font-bold text-slate-900">
          {course.id}
        </span>
        <span className="text-[0.78rem] text-slate-500">{course.name}</span>
        <span className="text-[0.68rem] text-slate-400 ml-2">
          Sprint 1 &middot; Course Design IDE
        </span>
        {EDIT_MODE && dirty && (
          <span
            className="text-[0.64rem] font-semibold px-1.5 py-[1px] rounded-full ml-1"
            style={{ backgroundColor: '#f59e0b18', color: '#d97706' }}
          >
            Unsaved changes
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Spectrum mini-legend */}
        <div className="flex gap-[1px] items-center mr-3">
          {layers.map((l, i) => (
            <span key={l.id} className="flex items-center">
              <span
                className="text-[0.6rem] font-semibold px-1"
                style={{ color: l.color }}
              >
                {l.name}
              </span>
              {i < layers.length - 1 && (
                <span className="text-slate-200 text-[0.7rem]">&rarr;</span>
              )}
            </span>
          ))}
        </div>

        {EDIT_MODE && (
          <>
            {dirty && (
              <button
                onClick={revert}
                className="text-[0.68rem] font-semibold px-2 py-[3px] rounded border border-slate-200 bg-white text-slate-500 cursor-pointer hover:text-slate-700"
              >
                Revert
              </button>
            )}
            <button
              onClick={handleCopy}
              className="text-[0.68rem] font-semibold px-2 py-[3px] rounded border-none cursor-pointer"
              style={{ backgroundColor: '#f1f5f9', color: copied ? '#0f766e' : '#64748b' }}
            >
              {copied ? 'Copied!' : 'Copy YAML'}
            </button>
            <button
              onClick={downloadYaml}
              className="text-[0.68rem] font-semibold px-2 py-[3px] rounded border-none cursor-pointer"
              style={{ backgroundColor: '#14b8a618', color: '#0f766e' }}
            >
              Download
            </button>
            <button
              onClick={onOpenImport}
              className="text-[0.68rem] font-semibold px-2 py-[3px] rounded border-none cursor-pointer"
              style={{ backgroundColor: '#8b5cf618', color: '#7c3aed' }}
            >
              Import
            </button>
          </>
        )}
      </div>
    </div>
  );
}
