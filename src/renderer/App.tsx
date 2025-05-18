// src/renderer/App.tsx
import React, { useContext, useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  TextField,
  Divider,
  Typography,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { AnimatePresence, motion } from 'framer-motion';
import AppTheme, { ColorModeContext } from './theme';
import useTodos from './hooks/useTodos';

interface Todo {
  id: number;
  text: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
}

const PRIORITY_COLORS: Record<Todo['priority'], string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981'
};

export default function App() {
  const colorMode = useContext(ColorModeContext);
  const [todos, setTodos] = useTodos() as [
    Todo[],
    React.Dispatch<React.SetStateAction<Todo[]>>
  ];

  // New‐task inputs
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState<Todo['priority']>('medium');

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  // Add a new task
  const addTask = () => {
    const text = newTask.trim();
    if (!text) return;
    setTodos(ts => [
      ...ts,
      { id: Date.now(), text, done: false, priority: newPriority }
    ]);
    setNewTask('');
  };

  // Toggle done
  const toggleDone = (id: number) =>
    setTodos(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));

  // Delete
  const deleteTask = (id: number) =>
    setTodos(ts => ts.filter(t => t.id !== id));

  // Start editing
  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  // Finish editing
  const finishEdit = () => {
    if (editingId === null) return;
    const text = editText.trim();
    if (text) {
      setTodos(ts => ts.map(t => t.id === editingId ? { ...t, text } : t));
    }
    setEditingId(null);
    setEditText('');
  };

  // HTML5 Drag handlers
  const handleDragStart = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setTodos(ts => {
      const copy = [...ts];
      const [moved] = copy.splice(draggedIndex, 1);
      copy.splice(index, 0, moved);
      return copy;
    });
    setDraggedIndex(null);
  };

  return (
    <AppTheme>
      <Drawer variant="persistent" anchor="right" open PaperProps={{ sx: { width: 280 } }}>
        {/* Header */}
        <Box sx={{ p:1, display:'flex', gap:1, alignItems:'center' }}>
          <Typography variant="h6" sx={{ flexGrow:1 }}>My TODOs</Typography>
          <IconButton size="small" onClick={() => window.electronAPI.hideWindow()}>
            <MinimizeIcon fontSize="inherit"/>
          </IconButton>
          <IconButton size="small" onClick={() => window.electronAPI.closeWindow()}>
            <CloseIcon fontSize="inherit"/>
          </IconButton>
          <IconButton size="small" onClick={colorMode.toggle}>🌓</IconButton>
        </Box>
        <Divider/>

        {/* Add New Task + Priority */}
        <Box sx={{ p:1, display:'flex', gap:1, alignItems:'center' }}>
          <FormControl size="small" sx={{ minWidth:100 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={newPriority}
              label="Priority"
              onChange={(e:SelectChangeEvent) => setNewPriority(e.target.value as Todo['priority'])}
            >
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth size="small" placeholder="New task…"
            value={newTask}
            onChange={e=>setNewTask(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTask();}}}
            InputProps={{
              endAdornment: (
                <IconButton onClick={addTask} size="small">
                  <AddIcon fontSize="inherit"/>
                </IconButton>
              )
            }}
          />
        </Box>

        {/* Draggable + Editable List */}
        <AnimatePresence initial={false}>
          {todos.map((todo, idx)=>(
            <motion.div
              key={todo.id}
              layout
              initial={{opacity:0,y:-10}}
              animate={{opacity:1,y:0}}
              exit={{opacity:0,y:10}}
              transition={{duration:0.15}}
              draggable
              onDragStart={handleDragStart(idx)}
              onDragOver={handleDragOver(idx)}
              onDrop={handleDrop(idx)}
              style={{marginBottom:4, cursor:'grab'}}
            >
              <ListItem
                disablePadding
                secondaryAction={
                  <IconButton edge="end" onClick={()=>deleteTask(todo.id)} size="small">
                    <DeleteIcon fontSize="inherit"/>
                  </IconButton>
                }
                sx={{borderLeft:`4px solid ${PRIORITY_COLORS[todo.priority]}`}}
              >
                <ListItemButton
                  onDoubleClick={()=>startEdit(todo)}
                >
                  <ListItemIcon>
                    <DragIndicatorIcon fontSize="small"/>
                  </ListItemIcon>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={todo.done}
                      onChange={()=>toggleDone(todo.id)}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>

                  {editingId===todo.id ? (
                    <TextField
                      value={editText}
                      size="small"
                      fullWidth
                      autoFocus
                      onChange={e=>setEditText(e.target.value)}
                      onBlur={finishEdit}
                      onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();finishEdit();}}}
                    />
                  ) : (
                    <ListItemText
                      primary={todo.text}
                      sx={{
                        textDecoration:todo.done?'line-through':'none',
                        opacity:todo.done?0.6:1
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            </motion.div>
          ))}
        </AnimatePresence>
      </Drawer>
    </AppTheme>
  );
}
