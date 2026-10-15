import React, { useEffect, useState } from 'react';
import { Bell, ChevronDown, Loader2, Megaphone } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import * as mobileApi from './mobileApi.js';
import { renderFormattedMarkdown } from '../utils/formattedMarkdown.jsx';
import styles from './MobileApp.module.css';

// Sections of the signed-in screen: the person's installments or the condominium's notices
export const MobileSection = Object.freeze({
  INSTALLMENTS: 'installments',
  NOTICES: 'notices'
});

/**
 * Notices of the condominium (GET /api/me/notices): the open reminders from today on and the published posts,
 * same rules as the web for individual members. A post opens to show its text.
 */
export default function MobileNotices({ timeboardId, t, dateLocale, onError }) {
  const [notices, setNotices] = useState(null);
  const [openPostId, setOpenPostId] = useState(null);

  useEffect(() => {
    if (!timeboardId) return undefined;
    let isActive = true;
    setNotices(null);
    mobileApi.getNotices(timeboardId)
      .then((result) => { if (isActive) setNotices(result || { posts: [], reminders: [] }); })
      .catch((err) => { if (isActive) { setNotices({ posts: [], reminders: [] }); onError(err); } });
    return () => { isActive = false; };
  }, [timeboardId, onError]);

  if (!notices) {
    return <Loader2 size={28} className={styles.spin} style={{ alignSelf: 'center', color: 'var(--primary)', marginTop: '24px' }} />;
  }

  const formatDate = (date) => format(parseISO(date), 'dd MMM yyyy', { locale: dateLocale });

  return (
    <>
      <div className={styles.card}>
        <div className={styles.noticeHeading}><Bell size={16} />{t('mobile.notices.reminders')}</div>
        {notices.reminders.length === 0 ? (
          <div className={styles.empty}>{t('mobile.notices.noReminders')}</div>
        ) : notices.reminders.map((reminder) => (
          <div key={reminder.id} className={styles.noticeItem}>
            <div className={styles.itemTitle}>{reminder.title}</div>
            <div className={styles.itemMeta}>{formatDate(reminder.date)}</div>
            {reminder.description ? <div className={styles.noticeText}>{renderFormattedMarkdown(reminder.description)}</div> : null}
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <div className={styles.noticeHeading}><Megaphone size={16} />{t('mobile.notices.posts')}</div>
        {notices.posts.length === 0 ? (
          <div className={styles.empty}>{t('mobile.notices.noPosts')}</div>
        ) : notices.posts.map((post) => {
          const isOpen = openPostId === post.id;
          return (
            <div key={post.id} className={styles.noticeItem}>
              <button
                type="button"
                className={styles.noticeToggle}
                onClick={() => setOpenPostId(isOpen ? null : post.id)}
                aria-expanded={isOpen}
              >
                <span style={{ minWidth: 0 }}>
                  <span className={styles.itemTitle} style={{ display: 'block' }}>{post.title}</span>
                  <span className={styles.itemMeta} style={{ display: 'block' }}>{formatDate(post.date)}</span>
                </span>
                {post.description ? <ChevronDown size={16} style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }} /> : null}
              </button>
              {isOpen && post.description ? <div className={styles.noticeText}>{renderFormattedMarkdown(post.description)}</div> : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
