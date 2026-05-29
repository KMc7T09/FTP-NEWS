import { useEffect, useState } from 'react';
import { getSettings } from '../supabase/api.js';

const defaults = {
  websiteName: 'THE FTP NEWS',
  footerText: 'Fresh Take Politics - independent reporting, clear context, and verified updates from Odisha for readers across India.',
  contactEmail: 'kubulukhotei@gmail.com',
  contactPhone: '',
  contactAddress: 'Odisha, India',
  defaultSeoTitle: 'THE FTP NEWS',
  defaultSeoDescription: 'THE FTP NEWS means Fresh Take Politics: independent political news, explainers, analysis, and public updates from Odisha and India.',
  founderName: 'KMC7T09',
  founderTitle: 'Founder, Full Stack Developer and Student',
  founderPhotoURL: '',
  founderBio:
    'KMC7T09 is the founder of THE FTP NEWS, a student and full stack developer from Odisha, India. FTP means Fresh Take Politics. The mission is to build an independent, clear, and reader-first news platform that explains politics and public issues in simple language for people across India.\n\nAuthor name: R.C. Khotei.',
  authorName: 'R.C. Khotei',
  teamText: 'Editorial Desk | News verification and publishing |  | \nPolitics Desk | Fresh Take Politics coverage |  | \nCommunity Desk | Reader tips, corrections, and feedback |  | ',
  socialLinks: { facebook: '', x: '', instagram: '', youtube: '', whatsapp: '', telegram: '' },
  logoURL: '',
};

export default function useSettings() {
  const [settings, setSettings] = useState(defaults);

  useEffect(() => {
    getSettings()
      .then((data) => {
        if (data) setSettings({ ...defaults, ...data, socialLinks: { ...defaults.socialLinks, ...(data.socialLinks || {}) } });
      })
      .catch(() => {});
  }, []);

  return settings;
}
