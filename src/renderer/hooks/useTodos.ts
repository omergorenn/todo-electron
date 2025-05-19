import { useEffect, useState } from 'react';

interface Todo {
  id: number;
  text: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
  section: string;
}

interface Section {
  id: string;
  name: string;
  expanded: boolean;
}

declare global {
  interface Window {
    electronAPI: {
      getTodos: () => Promise<{todos: Todo[], sections: Section[]}>;
      saveTodos: (data: {todos: Todo[], sections: Section[]}) => Promise<{ success: boolean }>;
      hideWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
    };
  }
}

const DEFAULT_SECTIONS: Section[] = [
  { id: 'today', name: 'Today', expanded: true },
  { id: 'later', name: 'Later', expanded: true }
];

const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [initialized, setInitialized] = useState<boolean>(false);

  // Load todos from storage on mount
  useEffect(() => {
    window.electronAPI
      .getTodos()
      .then(data => {
        // Handle legacy format where data is just an array of todos
        if (Array.isArray(data)) {
          // Add default section to any todos without a section
          setTodos(data.map(todo => ({
            ...todo,
            section: todo.section || 'today'
          })));
          setSections(DEFAULT_SECTIONS);
        } else {
          // Handle new format with todos and sections
          setTodos(data.todos || []);
          setSections(data.sections || DEFAULT_SECTIONS);
        }
        setInitialized(true);
      })
      .catch(err => {
        console.error('getTodos failed:', err);
        setTodos([]);
        setSections(DEFAULT_SECTIONS);
        setInitialized(true);
      });
  }, []);

  // Save todos and sections whenever they change (after initial load)
  useEffect(() => {
    if (!initialized) return;
    
    // Only save if we have something
    window.electronAPI
      .saveTodos({ todos, sections })
      .catch(err => console.error('saveTodos failed:', err));
  }, [todos, sections, initialized]);

  return [todos, setTodos, sections, setSections] as const;
};

export default useTodos;
