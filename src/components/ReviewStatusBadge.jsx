const STATUS_CONFIG = {
  proposed: {
    icon: '\uD83D\uDFE1',
    label: 'Proposed',
    textColor: '#d97706',
    bgColor: '#fef3c718',
    borderColor: '#fcd34d40',
  },
  confirmed: {
    icon: '\u2705',
    label: 'Confirmed',
    textColor: '#15803d',
    bgColor: '#dcfce718',
    borderColor: '#86efac40',
  },
  needs_review: {
    icon: '\u26A0\uFE0F',
    label: 'Needs Review',
    textColor: '#ea580c',
    bgColor: '#fff7ed18',
    borderColor: '#fdba7440',
  },
};

export function getReviewStatus(assignment) {
  return assignment?.review_status || 'confirmed';
}

export function isProposed(assignment) {
  return getReviewStatus(assignment) === 'proposed';
}

export function needsReview(assignment) {
  return getReviewStatus(assignment) === 'needs_review';
}

export function getReviewStyle(assignment) {
  const status = getReviewStatus(assignment);
  if (status === 'confirmed') return {};
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.proposed;
  return {
    opacity: status === 'proposed' ? 0.75 : 1,
    borderStyle: status === 'proposed' ? 'dashed' : undefined,
    borderColor: cfg.borderColor,
  };
}

export default function ReviewStatusBadge({ assignment, size = 'sm' }) {
  const status = getReviewStatus(assignment);
  if (status === 'confirmed') return null;

  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;

  const isSmall = size === 'sm';

  return (
    <span
      className="inline-flex items-center gap-[2px] rounded-full font-semibold"
      style={{
        fontSize: isSmall ? '0.58rem' : '0.66rem',
        padding: isSmall ? '0 4px' : '1px 6px',
        backgroundColor: cfg.bgColor,
        color: cfg.textColor,
        border: `1px solid ${cfg.borderColor}`,
      }}
    >
      <span style={{ fontSize: isSmall ? '0.52rem' : '0.6rem' }}>{cfg.icon}</span>
      {!isSmall && cfg.label}
    </span>
  );
}
