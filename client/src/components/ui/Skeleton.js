import React from 'react';

const Skeleton = ({ width = '100%', height = 16, borderRadius = 6, style = {} }) => (
  <div
    className="loading-pulse"
    style={{
      width,
      height,
      borderRadius,
      background: 'var(--border)',
      display: 'block',
      ...style
    }}
  />
);

export const CardSkeleton = () => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <Skeleton height={20} width="70%" style={{ marginBottom: 8 }} />
        <Skeleton height={12} width="30%" />
      </div>
      <Skeleton height={24} width={80} borderRadius={50} />
    </div>
    <Skeleton height={14} width="90%" />
    <Skeleton height={14} width="60%" />
    <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
      <Skeleton height={12} width={80} />
      <Skeleton height={12} width={100} />
      <Skeleton height={12} width={90} />
    </div>
  </div>
);

export const StatCardSkeleton = () => (
  <div className="stat-card">
    <Skeleton width={48} height={48} borderRadius={12} style={{ flexShrink: 0 }} />
    <div style={{ flex: 1 }}>
      <Skeleton height={28} width="50%" style={{ marginBottom: 6 }} />
      <Skeleton height={13} width="70%" />
    </div>
  </div>
);

export const TableRowSkeleton = ({ cols = 6 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i}><Skeleton height={14} width={i === 0 ? 80 : i === 1 ? '80%' : '60%'} /></td>
    ))}
  </tr>
);

export const PageLoadSkeleton = () => (
  <div style={{ padding: 32 }}>
    <div style={{ marginBottom: 32 }}>
      <Skeleton height={40} width={260} style={{ marginBottom: 8 }} />
      <Skeleton height={16} width={200} />
    </div>
    <div className="grid-4" style={{ marginBottom: 28 }}>
      {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
    </div>
    <div className="card">
      <Skeleton height={22} width={200} style={{ marginBottom: 20 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
      </div>
    </div>
  </div>
);

export default Skeleton;
