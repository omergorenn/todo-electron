import { useEffect, useState } from 'react';

declare global {
  interface Window {
    electronAPI: {
      getTodos: () => Promise<any[]>;
      saveTodos: (todos: any[]) => Promise<{ success: boolean }>;
      hideWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
    };
  }
}

const useTodos = () => {
  const [todos, setTodos] = useState<any[]>([]);

  useEffect(() => {
    window.electronAPI
      .getTodos()
      .then(setTodos)
      .catch(err => {
        console.error('getTodos failed:', err);
        setTodos([]);
      });
  }, []);

  useEffect(() => {
    // Only save if we have something
    if (todos.length) {
      window.electronAPI
        .saveTodos(todos)
        .catch(err => console.error('saveTodos failed:', err));
    }
  }, [todos]);

  return [todos, setTodos] as const;
};

export default useTodos;
