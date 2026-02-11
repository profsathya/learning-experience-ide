import { useCourseData } from '../../hooks/useCourseData';

export default function PathwayBadge({ id, size = 'sm' }) {
  const { getPathway } = useCourseData();
  const pw = getPathway(id);
  if (!pw) return null;

  const small = size === 'sm';

  return (
    <span
      className={`inline-block rounded-full font-semibold ${small ? 'text-[0.62rem] px-[7px] py-[2px]' : 'text-[0.72rem] px-[9px] py-[3px]'}`}
      style={{
        backgroundColor: pw.color + '10',
        color: pw.color,
        border: `1px solid ${pw.color}20`,
      }}
    >
      {pw.abbr}
    </span>
  );
}
