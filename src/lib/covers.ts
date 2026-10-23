import type { CoverId } from '@/lib/types';

export const covers: Record<CoverId, { from: string; to: string }> = {
    ink: { from: '#171c24', to: '#3a4960' },
    wine: { from: '#241416', to: '#6a3038' },
    moss: { from: '#161e1b', to: '#3d5246' },
    sand: { from: '#2c261f', to: '#8a7358' },
    dusk: { from: '#1a1728', to: '#4c4672' },
    copper: { from: '#271c14', to: '#7a5134' },
};
