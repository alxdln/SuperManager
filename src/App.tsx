import React from 'react';
import { FantasyProvider } from './context/FantasyContext';
import { MobileShell } from './components/common/MobileShell';

export default function App() {
  return (
    <FantasyProvider>
      <MobileShell />
    </FantasyProvider>
  );
}
