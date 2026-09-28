import type { Component } from 'svelte';

export interface DialogItem {
  id: string;
  component: any;
  props?: Record<string, any>;
}

let dialogsState = $state<DialogItem[]>([]);

export const dialogStore = {
  get current() {
    return dialogsState.length > 0 ? dialogsState[dialogsState.length - 1] : null;
  },
  get stack() {
    return dialogsState;
  }
};

export function openDialog(component: any, props: Record<string, any> = {}) {
  const id = Math.random().toString(36).substring(2, 9);
  dialogsState = [...dialogsState, { id, component, props }];
  return id;
}

export function closeDialog() {
  if (dialogsState.length > 0) {
    dialogsState = dialogsState.slice(0, -1);
  }
}

export function closeAllDialogs() {
  dialogsState = [];
}
