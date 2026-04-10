"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect } from 'react';

type KeyboardShortcutConfig = {
    key: string;
    ctrl?: boolean;
    meta?: boolean; // Cmd on Mac
    shift?: boolean;
    alt?: boolean;
    callback: (e: KeyboardEvent) => void;
    preventDefault?: boolean;
};

export function useKeyboardShortcuts(shortcuts: KeyboardShortcutConfig[]) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            for (const shortcut of shortcuts) {
                const ctrlMatch = shortcut.ctrl ? e.ctrlKey : true;
                const metaMatch = shortcut.meta ? e.metaKey : true;
                const shiftMatch = shortcut.shift !== undefined ? e.shiftKey === shortcut.shift : true;
                const altMatch = shortcut.alt !== undefined ? e.altKey === shortcut.alt : true;
                const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

                // For Ctrl/Cmd shortcuts, check if either Ctrl (Windows/Linux) or Cmd (Mac) is pressed
                const modifierMatch = shortcut.ctrl || shortcut.meta
                    ? (e.ctrlKey || e.metaKey)
                    : true;

                if (keyMatch && modifierMatch && shiftMatch && altMatch) {
                    if (shortcut.preventDefault !== false) {
                        e.preventDefault();
                    }
                    shortcut.callback(e);
                    break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}
