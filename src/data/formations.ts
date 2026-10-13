import { FormationSlot, TacticalFormation } from '../types/football';

/**
 * FORMATIONS CONFIGURATION
 * Rule: Jucătorii de pe aceeași linie tactică (portar, fundași, mijlocași, atacanți)
 * sunt plasați pe EXACT aceeași linie orizontală (aceeași coordonată Y) pentru a preveni orice suprapunere.
 * Distanță egală între liniile Fundași (y=60) - Mijlocași (y=36) - Atacanți (y=12) -> delta Y = 24.
 * Portarul rămâne pe loc la y=88.
 * Sortate de la număr de fundași mic -> mare (3 -> 4 -> 5).
 */
export const FORMATIONS: Record<TacticalFormation, { name: string; slots: FormationSlot[] }> = {
  // Formații cu 3 fundași
  '3-4-3': {
    name: '3-4-3',
    slots: [
      { slotId: 'gk', label: 'POR', position: 'GK', x: 50, y: 88 },
      // Fundași: y = 60
      { slotId: 'lcb', label: 'FC', position: 'DEF', x: 26, y: 60 },
      { slotId: 'cb', label: 'FC', position: 'DEF', x: 50, y: 60 },
      { slotId: 'rcb', label: 'FC', position: 'DEF', x: 74, y: 60 },
      // Mijlocași: y = 36
      { slotId: 'lm', label: 'MS', position: 'MID', x: 14, y: 36 },
      { slotId: 'lcm', label: 'MC', position: 'MID', x: 38, y: 36 },
      { slotId: 'rcm', label: 'MC', position: 'MID', x: 62, y: 36 },
      { slotId: 'rm', label: 'MD', position: 'MID', x: 86, y: 36 },
      // Atacanți: y = 12
      { slotId: 'lw', label: 'AS', position: 'FWD', x: 20, y: 12 },
      { slotId: 'st', label: 'AC', position: 'FWD', x: 50, y: 12 },
      { slotId: 'rw', label: 'AD', position: 'FWD', x: 80, y: 12 },
    ],
  },
  '3-5-2': {
    name: '3-5-2',
    slots: [
      { slotId: 'gk', label: 'POR', position: 'GK', x: 50, y: 88 },
      // Fundași: y = 60
      { slotId: 'lcb', label: 'FC', position: 'DEF', x: 26, y: 60 },
      { slotId: 'cb', label: 'LIB', position: 'DEF', x: 50, y: 60 },
      { slotId: 'rcb', label: 'FC', position: 'DEF', x: 74, y: 60 },
      // Mijlocași: y = 36
      { slotId: 'lwb', label: 'WB-S', position: 'MID', x: 10, y: 36 },
      { slotId: 'lcm', label: 'MC', position: 'MID', x: 30, y: 36 },
      { slotId: 'cam', label: 'MO', position: 'MID', x: 50, y: 36 },
      { slotId: 'rcm', label: 'MC', position: 'MID', x: 70, y: 36 },
      { slotId: 'rwb', label: 'WB-D', position: 'MID', x: 90, y: 36 },
      // Atacanți: y = 12
      { slotId: 'ls', label: 'AC', position: 'FWD', x: 36, y: 12 },
      { slotId: 'rs', label: 'AC', position: 'FWD', x: 64, y: 12 },
    ],
  },
  '3-6-1': {
    name: '3-6-1',
    slots: [
      { slotId: 'gk', label: 'POR', position: 'GK', x: 50, y: 88 },
      // Fundași: y = 60
      { slotId: 'lcb', label: 'FC', position: 'DEF', x: 26, y: 60 },
      { slotId: 'cb', label: 'FC', position: 'DEF', x: 50, y: 60 },
      { slotId: 'rcb', label: 'FC', position: 'DEF', x: 74, y: 60 },
      // Mijlocași: toți 6 pe linia y = 36
      { slotId: 'lm', label: 'MS', position: 'MID', x: 12, y: 36 },
      { slotId: 'ldm', label: 'MDC', position: 'MID', x: 27, y: 36 },
      { slotId: 'lcm', label: 'MC', position: 'MID', x: 42, y: 36 },
      { slotId: 'rcm', label: 'MC', position: 'MID', x: 58, y: 36 },
      { slotId: 'rdm', label: 'MDC', position: 'MID', x: 73, y: 36 },
      { slotId: 'rm', label: 'MD', position: 'MID', x: 88, y: 36 },
      // Atacant: y = 12
      { slotId: 'st', label: 'AC', position: 'FWD', x: 50, y: 12 },
    ],
  },

  // Formații cu 4 fundași
  '4-3-3': {
    name: '4-3-3',
    slots: [
      { slotId: 'gk', label: 'POR', position: 'GK', x: 50, y: 88 },
      // Fundași: y = 60
      { slotId: 'lb', label: 'FS', position: 'DEF', x: 14, y: 60 },
      { slotId: 'lcb', label: 'FC', position: 'DEF', x: 38, y: 60 },
      { slotId: 'rcb', label: 'FC', position: 'DEF', x: 62, y: 60 },
      { slotId: 'rb', label: 'FD', position: 'DEF', x: 86, y: 60 },
      // Mijlocași: y = 36
      { slotId: 'lcm', label: 'MC', position: 'MID', x: 26, y: 36 },
      { slotId: 'cm', label: 'MDC', position: 'MID', x: 50, y: 36 },
      { slotId: 'rcm', label: 'MC', position: 'MID', x: 74, y: 36 },
      // Atacanți: y = 12
      { slotId: 'lw', label: 'AS', position: 'FWD', x: 20, y: 12 },
      { slotId: 'st', label: 'AC', position: 'FWD', x: 50, y: 12 },
      { slotId: 'rw', label: 'AD', position: 'FWD', x: 80, y: 12 },
    ],
  },
  '4-4-2': {
    name: '4-4-2',
    slots: [
      { slotId: 'gk', label: 'POR', position: 'GK', x: 50, y: 88 },
      // Fundași: y = 60
      { slotId: 'lb', label: 'FS', position: 'DEF', x: 14, y: 60 },
      { slotId: 'lcb', label: 'FC', position: 'DEF', x: 38, y: 60 },
      { slotId: 'rcb', label: 'FC', position: 'DEF', x: 62, y: 60 },
      { slotId: 'rb', label: 'FD', position: 'DEF', x: 86, y: 60 },
      // Mijlocași: y = 36
      { slotId: 'lm', label: 'MS', position: 'MID', x: 14, y: 36 },
      { slotId: 'lcm', label: 'MC', position: 'MID', x: 38, y: 36 },
      { slotId: 'rcm', label: 'MC', position: 'MID', x: 62, y: 36 },
      { slotId: 'rm', label: 'MD', position: 'MID', x: 86, y: 36 },
      // Atacanți: y = 12
      { slotId: 'ls', label: 'AC', position: 'FWD', x: 36, y: 12 },
      { slotId: 'rs', label: 'AC', position: 'FWD', x: 64, y: 12 },
    ],
  },
  '4-5-1': {
    name: '4-5-1',
    slots: [
      { slotId: 'gk', label: 'POR', position: 'GK', x: 50, y: 88 },
      // Fundași: y = 60
      { slotId: 'lb', label: 'FS', position: 'DEF', x: 14, y: 60 },
      { slotId: 'lcb', label: 'FC', position: 'DEF', x: 38, y: 60 },
      { slotId: 'rcb', label: 'FC', position: 'DEF', x: 62, y: 60 },
      { slotId: 'rb', label: 'FD', position: 'DEF', x: 86, y: 60 },
      // Mijlocași: toți 5 pe linia y = 36
      { slotId: 'lm', label: 'MS', position: 'MID', x: 10, y: 36 },
      { slotId: 'lcm', label: 'MC', position: 'MID', x: 30, y: 36 },
      { slotId: 'cm', label: 'MDC', position: 'MID', x: 50, y: 36 },
      { slotId: 'rcm', label: 'MC', position: 'MID', x: 70, y: 36 },
      { slotId: 'rm', label: 'MD', position: 'MID', x: 90, y: 36 },
      // Atacant: y = 12
      { slotId: 'st', label: 'AC', position: 'FWD', x: 50, y: 12 },
    ],
  },

  // Formații cu 5 fundași
  '5-3-2': {
    name: '5-3-2',
    slots: [
      { slotId: 'gk', label: 'POR', position: 'GK', x: 50, y: 88 },
      // Fundași: toți 5 pe linia y = 60
      { slotId: 'lwb', label: 'LWB', position: 'DEF', x: 10, y: 60 },
      { slotId: 'lcb', label: 'FC', position: 'DEF', x: 30, y: 60 },
      { slotId: 'cb', label: 'FC', position: 'DEF', x: 50, y: 60 },
      { slotId: 'rcb', label: 'FC', position: 'DEF', x: 70, y: 60 },
      { slotId: 'rwb', label: 'RWB', position: 'DEF', x: 90, y: 60 },
      // Mijlocași: toți 3 pe linia y = 36
      { slotId: 'lcm', label: 'MC', position: 'MID', x: 26, y: 36 },
      { slotId: 'cm', label: 'MC', position: 'MID', x: 50, y: 36 },
      { slotId: 'rcm', label: 'MC', position: 'MID', x: 74, y: 36 },
      // Atacanți: ambii pe linia y = 12
      { slotId: 'ls', label: 'AC', position: 'FWD', x: 36, y: 12 },
      { slotId: 'rs', label: 'AC', position: 'FWD', x: 64, y: 12 },
    ],
  },
  '5-2-3': {
    name: '5-2-3',
    slots: [
      { slotId: 'gk', label: 'POR', position: 'GK', x: 50, y: 88 },
      // Fundași: toți 5 pe linia y = 60
      { slotId: 'lwb', label: 'LWB', position: 'DEF', x: 10, y: 60 },
      { slotId: 'lcb', label: 'FC', position: 'DEF', x: 30, y: 60 },
      { slotId: 'cb', label: 'FC', position: 'DEF', x: 50, y: 60 },
      { slotId: 'rcb', label: 'FC', position: 'DEF', x: 70, y: 60 },
      { slotId: 'rwb', label: 'RWB', position: 'DEF', x: 90, y: 60 },
      // Mijlocași: ambii pe linia y = 36
      { slotId: 'lcm', label: 'MC', position: 'MID', x: 36, y: 36 },
      { slotId: 'rcm', label: 'MC', position: 'MID', x: 64, y: 36 },
      // Atacanți: toți 3 pe linia y = 12
      { slotId: 'lw', label: 'AS', position: 'FWD', x: 20, y: 12 },
      { slotId: 'st', label: 'AC', position: 'FWD', x: 50, y: 12 },
      { slotId: 'rw', label: 'AD', position: 'FWD', x: 80, y: 12 },
    ],
  },
};
