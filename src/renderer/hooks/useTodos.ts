import { useEffect, useState, useCallback } from 'react';

interface Todo {
  id: number;
  text: string;
  description: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
  section: string;
  createdAt: number;
}

interface Section {
  id: string;
  name: string;
  expanded: boolean;
}

type SortMethod = 'priority' | 'createdAt' | 'none';

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

// Utility function to assign priority values for sorting
const getPriorityValue = (priority: Todo['priority']): number => {
  switch (priority) {
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
};

const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [sortMethod, setSortMethod] = useState<SortMethod>('none');

  // Load todos from storage on mount
  useEffect(() => {
    window.electronAPI
      .getTodos()
      .then(data => {
        // Handle legacy format where data is just an array of todos
        if (Array.isArray(data)) {
          // Add default section and missing fields to any todos without them
          setTodos(data.map(todo => ({
            ...todo,
            section: todo.section || 'today',
            description: todo.description || '',
            createdAt: todo.createdAt || Date.now()
          })));
          setSections(DEFAULT_SECTIONS);
        } else {
          // Handle new format with todos and sections
          // Add default values for new fields if missing
          setTodos((data.todos || []).map(todo => ({
            ...todo,
            description: todo.description || '',
            createdAt: todo.createdAt || Date.now()
          })));
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

  // Sort the todos based on current sort method
  const getSortedTodos = useCallback((todosList: Todo[]): Todo[] => {
    if (sortMethod === 'none') return todosList;
    
    return [...todosList].sort((a, b) => {
      // Always put completed items at the bottom
      if (a.done !== b.done) return a.done ? 1 : -1;
      
      if (sortMethod === 'priority') {
        // High to low priority (3 -> 1)
        return getPriorityValue(b.priority) - getPriorityValue(a.priority);
      } 
      else if (sortMethod === 'createdAt') {
        // Newest to oldest
        return b.createdAt - a.createdAt;
      }
      // Default case
      return 0;
    });
  }, [sortMethod]);

  // Return sorted todos and other values
  return {
    todos: getSortedTodos(todos), 
    setTodos, 
    sections, 
    setSections,
    sortMethod,
    setSortMethod
  };
};

export default useTodos;
