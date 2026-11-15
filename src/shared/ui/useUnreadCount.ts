import { useEffect, useState } from 'react';
import { Repository, USER_CHANGED_EVENT } from '../data/repository';

/**
 * Unread chat messages for the signed-in user, for the Plans tab badge. Re-checks on a light
 * interval (simulated replies "arrive" a moment after sending) and on storage / user changes.
 */
export function useUnreadCount(intervalMs = 2000): number {
  const read = () => Repository.getUnreadCount(Repository.getCurrentUser());
  const [count, setCount] = useState<number>(read);

  useEffect(() => {
    const update = () => setCount(read());
    const id = window.setInterval(update, intervalMs);
    window.addEventListener('storage', update);
    window.addEventListener(USER_CHANGED_EVENT, update);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('storage', update);
      window.removeEventListener(USER_CHANGED_EVENT, update);
    };
  }, [intervalMs]); // `read` re-reads storage on every call, so it needn't be a dependency

  return count;
}

/** Small red count bubble used on the Plans tab */
export const unreadBadgeClass =
  'min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-4 text-center';
