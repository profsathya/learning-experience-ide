import { useCourseData } from '../../hooks/useCourseData';

export default function LayerBadge({ id, isPrimary = false, size = 'sm' }) {
  const { getLayer } = useCourseData();
  const layer = getLayer(id);
  if (!layer) return null;

  const small = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${small ? 'text-[0.62rem] px-[7px] py-[2px]' : 'text-[0.72rem] px-[9px] py-[3px]'}`}
      style={{
        backgroundColor: layer.color + (isPrimary ? '20' : '0c'),
        color: layer.color,
        fontWeight: isPrimary ? 700 : 500,
        border: `1px solid ${layer.color}${isPrimary ? '40' : '20'}`,
      }}
    >
      {isPrimary && (
        <span
          className="inline-block w-[5px] h-[5px] rounded-full"
          style={{ backgroundColor: layer.color }}
        />
      )}
      {layer.name}
    </span>
  );
}
