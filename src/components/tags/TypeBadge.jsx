const TYPE_STYLES = {
  goal:       { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', label: 'Goal' },
  activity:   { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46', label: 'Activity' },
  reflection: { bg: '#ede9fe', border: '#c4b5fd', text: '#5b21b6', label: 'Reflection' },
  demo:       { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', label: 'Demo' },
  peer:       { bg: '#ccfbf1', border: '#5eead4', text: '#115e59', label: 'Peer' },
};

export function getTypeStyle(type) {
  return TYPE_STYLES[type] || TYPE_STYLES.activity;
}

export default function TypeBadge({ type }) {
  const t = getTypeStyle(type);
  return (
    <span
      className="inline-block text-[0.6rem] px-2 py-[2px] rounded-full font-bold uppercase tracking-wide"
      style={{ backgroundColor: t.bg, color: t.text }}
    >
      {t.label}
    </span>
  );
}
