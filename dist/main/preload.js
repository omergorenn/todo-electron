"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/main/preload.ts
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    getTodos: () => electron_1.ipcRenderer.invoke('getTodos'),
    saveTodos: (todos) => electron_1.ipcRenderer.invoke('saveTodos', todos),
    hideWindow: () => electron_1.ipcRenderer.invoke('hide-window'),
    closeWindow: () => electron_1.ipcRenderer.invoke('close-window'),
});
