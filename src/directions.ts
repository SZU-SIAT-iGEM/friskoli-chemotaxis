import type {CSSProperties} from 'react';

// One visual identity per board direction, shared by dice, paths and the legend.
export const directionStyle=(face:number):CSSProperties=>({'--direction':`var(--dir-${Math.abs(face)})`} as CSSProperties);
