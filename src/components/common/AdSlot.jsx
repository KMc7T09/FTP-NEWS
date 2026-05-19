import { useEffect, useState } from 'react';
import { listActiveAds } from '../../supabase/api.js';

function renderContent(ad) {
  if (ad.type === 'image') return <img src={ad.content} alt="Advertisement" className="max-h-40 w-full object-contain" />;
  if (ad.type === 'code') return <div dangerouslySetInnerHTML={{ __html: ad.content }} />;
  return <span>{ad.content}</span>;
}

export default function AdSlot({ label = 'Advertisement', position = '', className = '' }) {
  const [ad, setAd] = useState(null);

  useEffect(() => {
    listActiveAds()
      .then((items) => setAd(items.find((item) => item.position === position || item.position === label) || null))
      .catch(() => setAd(null));
  }, [label, position]);

  if (!ad) return null;
  return <aside className={`ad-slot ${className}`}>{renderContent(ad)}</aside>;
}
