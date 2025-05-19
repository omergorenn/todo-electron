// src/renderer/App.tsx
import React, { useContext, useState, useEffect } from 'react';
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
  ListItemText,
  Paper,
  Collapse,
  InputBase
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LabelIcon from '@mui/icons-material/Label';
import CircleIcon from '@mui/icons-material/Circle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { AnimatePresence, motion } from 'framer-motion';
import AppTheme, { ColorModeContext } from './theme';
import useTodos from './hooks/useTodos';

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

const DEFAULT_SECTIONS: Section[] = [
  { id: 'today', name: 'Today', expanded: true },
  { id: 'later', name: 'Later', expanded: true }
];

const PRIORITY_COLORS: Record<Todo['priority'], string> = {
  high: 'rgba(239, 68, 68, 0.7)',   // Softer red
  medium: 'rgba(245, 158, 11, 0.7)', // Softer amber
  low: 'rgba(16, 185, 129, 0.7)'     // Softer green
};

export default function App() {
  const colorMode = useContext(ColorModeContext);
  const [todos, setTodos, sections, setSections] = useTodos() as [
    Todo[],
    React.Dispatch<React.SetStateAction<Todo[]>>,
    Section[],
    React.Dispatch<React.SetStateAction<Section[]>>
  ];

  // New‐task inputs
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState<Todo['priority']>('medium');
  const [newSection, setNewSection] = useState<string>(sections[0]?.id || 'today');

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Add state for drag over section
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);

  // Add global event listener to reset drag state
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setDraggedIndex(null);
      setDragOverSection(null);
    };
    
    document.addEventListener('dragend', handleGlobalDragEnd);
    
    // Clean up the event listener when component unmounts
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, []);

  // Fix for drag handler type errors
  const handleTodoDragStart = (todo: Todo) => (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedIndex(todos.indexOf(todo));
    // Store the todo data for transfer
    e.dataTransfer.setData('text/plain', todo.id.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  // Ensure dragOverSection is cleared when drag ends
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverSection(null);
  };
  
  // Allow dropping on section headers with visual feedback
  const handleSectionDragOver = (sectionId: string) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSection(sectionId);
  };

  const handleSectionDragLeave = () => {
    setDragOverSection(null);
  };

  // Handle dropping on another todo
  const handleTodoDrop = (targetTodo: Todo) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex === null) return;
    
    const sourceIndex = draggedIndex;
    const targetIndex = todos.indexOf(targetTodo);
    
    if (sourceIndex === targetIndex) return;
    
    setTodos(ts => {
      const copy = [...ts];
      const sourceTodo = { ...copy[sourceIndex] };
      
      // Remove the source todo
      copy.splice(sourceIndex, 1);
      
      // Update section if dropping on a todo in a different section
      sourceTodo.section = targetTodo.section;
      
      // Find where to insert in the target section
      const newTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      copy.splice(newTargetIndex, 0, sourceTodo);
      
      return copy;
    });
    
    setDragOverSection(null);
    setDraggedIndex(null);
  };

  // Handle dropping directly on a section
  const handleSectionDrop = (sectionId: string) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex === null) return;
    const todoId = e.dataTransfer.getData('text/plain');
    
    // Move the todo to this section
    setTodos(ts => {
      return ts.map(t => {
        if (t.id.toString() === todoId) {
          return { ...t, section: sectionId };
        }
        return t;
      });
    });
    
    setDragOverSection(null);
    setDraggedIndex(null);
  };

  // Add a new task
  const addTask = () => {
    const text = newTask.trim();
    if (!text) return;
    setTodos(ts => [
      ...ts,
      { 
        id: Date.now(), 
        text, 
        done: false, 
        priority: newPriority,
        section: newSection 
      }
    ]);
    setNewTask('');
  };

  // Toggle done
  const toggleDone = (id: number) => {
    setTodos(ts => {
      const updatedTodos = ts.map(t => {
        if (t.id === id) {
          return { ...t, done: !t.done };
        }
        return t;
      });
      return updatedTodos;
    });
  };

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

  // Toggle section expanded/collapsed
  const toggleSection = (sectionId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, expanded: !s.expanded } : s
    ));
  };

  // Add new section
  const addSection = () => {
    if (!newSectionName.trim()) return;
    
    const newId = newSectionName.toLowerCase().replace(/\s+/g, '-');
    
    // Check if this section ID already exists
    if (sections.some(s => s.id === newId)) {
      alert('A section with a similar name already exists.');
      return;
    }
    
    setSections([
      ...sections,
      { id: newId, name: newSectionName.trim(), expanded: true }
    ]);
    
    setNewSectionName('');
    setIsAddingSection(false);
  };

  // Delete section and all its todos
  const deleteSection = (sectionId: string) => {
    if (confirm(`Delete section "${sections.find(s => s.id === sectionId)?.name}" and all its tasks?`)) {
      setTodos(todos.filter(t => t.section !== sectionId));
      setSections(sections.filter(s => s.id !== sectionId));
    }
  };

  return (
    <AppTheme>
      <Drawer variant="persistent" anchor="right" open PaperProps={{ sx: { width: 280, boxShadow: 'none', borderLeft: '1px solid rgba(0,0,0,0.1)' } }}>
        {/* Header - Simplified */}
        <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 500, letterSpacing: '-0.01em' }}>Tasks</Typography>
          <IconButton size="small" onClick={colorMode.toggle} sx={{ opacity: 0.6 }}>🌓</IconButton>
          <IconButton size="small" onClick={() => window.electronAPI.hideWindow()} sx={{ opacity: 0.6 }}>
            <MinimizeIcon fontSize="inherit"/>
          </IconButton>
          <IconButton size="small" onClick={() => window.electronAPI.closeWindow()} sx={{ opacity: 0.6 }}>
            <CloseIcon fontSize="inherit"/>
          </IconButton>
        </Box>
        <Divider />

        {/* Add New Task - Simplified */}
        <Box sx={{ p: 1.5, pt: 2 }}>
          <Box sx={{ display: 'flex', mb: 1, gap: 1 }}>
            <FormControl size="small" fullWidth>
              <Select
                value={newSection}
                onChange={(e:SelectChangeEvent) => setNewSection(e.target.value)}
                displayEmpty
                sx={{ '& .MuiSelect-select': { py: 1 } }}
              >
                {sections.map(section => (
                  <MenuItem key={section.id} value={section.id}>
                    {section.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select
                value={newPriority}
                onChange={(e:SelectChangeEvent) => setNewPriority(e.target.value as Todo['priority'])}
                sx={{ '& .MuiSelect-select': { py: 1, px: 1.5 } }}
              >
                <MenuItem value="high">
                  <CircleIcon sx={{ color: PRIORITY_COLORS.high, fontSize: 10, mr: 1 }} />
                  High
                </MenuItem>
                <MenuItem value="medium">
                  <CircleIcon sx={{ color: PRIORITY_COLORS.medium, fontSize: 10, mr: 1 }} />
                  Medium
                </MenuItem>
                <MenuItem value="low">
                  <CircleIcon sx={{ color: PRIORITY_COLORS.low, fontSize: 10, mr: 1 }} />
                  Low
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <TextField
              fullWidth 
              size="small" 
              placeholder="Add a task..."
              value={newTask}
              onChange={e=>setNewTask(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTask();}}}
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 1,
                  bgcolor: 'background.paper'
                }
              }}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={addTask} size="small" sx={{ opacity: 0.7 }}>
                    <AddIcon fontSize="inherit"/>
                  </IconButton>
                )
              }}
            />
          </Box>
        </Box>

        {/* Sections List - Simplified */}
        <Box sx={{ overflow: 'auto', flexGrow: 1, px: 1.5, pt: 1 }}>
          {sections.map(section => {
            const sectionTodos = todos.filter(todo => todo.section === section.id);
            const activeTodos = sectionTodos.filter(todo => !todo.done);
            const completedTodos = sectionTodos.filter(todo => todo.done);
            
            return (
              <Box 
                key={section.id} 
                sx={{ 
                  mb: 1.5,
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: 'background.paper'
                }}
              >
                {/* Section Header - Simplified */}
                <Box 
                  sx={{ 
                    py: 1,
                    px: 1.5,
                    display: 'flex', 
                    alignItems: 'center',
                    bgcolor: dragOverSection === section.id 
                      ? 'rgba(25, 118, 210, 0.08)' 
                      : 'transparent',
                    cursor: 'pointer',
                    borderBottom: section.expanded ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => toggleSection(section.id)}
                  onDragOver={handleSectionDragOver(section.id)}
                  onDragLeave={handleSectionDragLeave}
                  onDrop={handleSectionDrop(section.id)}
                >
                  {section.expanded ? (
                    <ExpandLessIcon fontSize="small" sx={{ opacity: 0.5, fontSize: 18 }} />
                  ) : (
                    <ExpandMoreIcon fontSize="small" sx={{ opacity: 0.5, fontSize: 18 }} />
                  )}
                  <Typography variant="subtitle2" sx={{ ml: 1, flexGrow: 1, fontWeight: 500, letterSpacing: '-0.01em' }}>
                    {section.name} 
                    <Box 
                      component="span" 
                      sx={{ 
                        ml: 1,
                        backgroundColor: activeTodos.length ? 'primary.main' : 'text.disabled',
                        color: 'white',
                        borderRadius: '10px',
                        padding: '1px 6px',
                        fontSize: '0.7rem',
                        display: 'inline-block',
                        transition: 'all 0.2s'
                      }}
                    >
                      {activeTodos.length}
                    </Box>
                    {dragOverSection === section.id && draggedIndex !== null && (
                      <Box component="span" sx={{ 
                        ml: 1, 
                        fontSize: '0.75rem', 
                        color: 'primary.main',
                        fontWeight: 500 
                      }}>
                        Drop here
                      </Box>
                    )}
                  </Typography>
                </Box>
                
                {/* Section Todos - Simplified */}
                <Collapse in={section.expanded}>
                  <AnimatePresence initial={false}>
                    {/* Active (Incomplete) Tasks */}
                    {activeTodos.map((todo) => (
                      <div
                        key={todo.id}
                        draggable
                        onDragStart={handleTodoDragStart(todo)}
                        onDragOver={handleSectionDragOver(section.id)}
                        onDrop={handleTodoDrop(todo)}
                        onDragEnd={handleDragEnd}
                        style={{cursor:'grab'}}
                      >
                        <motion.div
                          layout
                          initial={{opacity:0,y:-10}}
                          animate={{opacity:1,y:0}}
                          exit={{opacity:0,y:10}}
                          transition={{duration:0.15}}
                        >
                          <ListItem
                            disablePadding
                            sx={{
                              borderLeft: `3px solid ${PRIORITY_COLORS[todo.priority]}`,
                              pl: 0.5
                            }}
                          >
                            <ListItemButton
                              onDoubleClick={()=>startEdit(todo)}
                              dense
                              sx={{ py: 0.5, borderRadius: 1 }}
                            >
                              <Checkbox
                                edge="start"
                                checked={todo.done}
                                onChange={()=>toggleDone(todo.id)}
                                icon={<CircleIcon sx={{ fontSize: 18, opacity: 0.3 }} />}
                                checkedIcon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
                                tabIndex={-1}
                                disableRipple
                                sx={{ p: 0.5, mr: 0.5 }}
                              />

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
                                  primaryTypographyProps={{ 
                                    variant: 'body2', 
                                    style: { 
                                      textDecoration: todo.done ? 'line-through' : 'none',
                                      fontWeight: 400
                                    }
                                  }}
                                  sx={{ m: 0 }}
                                />
                              )}
                              
                              <IconButton 
                                size="small" 
                                onClick={()=>deleteTask(todo.id)} 
                                sx={{ opacity: 0, transition: 'opacity 0.2s', '.MuiListItem-root:hover &': { opacity: 0.5 } }}
                              >
                                <DeleteIcon fontSize="small" sx={{ fontSize: 16 }}/>
                              </IconButton>
                            </ListItemButton>
                          </ListItem>
                        </motion.div>
                      </div>
                    ))}
                    
                    {/* No active tasks message */}
                    {activeTodos.length === 0 && !completedTodos.length && (
                      <Box sx={{ p:1.5, textAlign:'center', color:'text.disabled' }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                          No tasks
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Completed Tasks Section with conditional header */}
                    {completedTodos.length > 0 && (
                      <Box sx={{ 
                        borderTop: activeTodos.length > 0 ? '1px dashed rgba(0,0,0,0.08)' : 'none', 
                        mt: activeTodos.length > 0 ? 1 : 0, 
                        pt: 0.5, 
                        pb: 0.5 
                      }}>
                        {/* Show "All tasks completed" only when no active tasks */}
                        {activeTodos.length === 0 ? (
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              textAlign: 'center',
                              px: 2, 
                              py: 0.5, 
                              color: 'text.disabled', 
                              display: 'block', 
                              fontSize: '0.8rem',
                              fontStyle: 'italic'
                            }}
                          >
                            All tasks completed
                          </Typography>
                        ) : (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              px: 2, 
                              py: 0.5, 
                              color: 'text.disabled', 
                              display: 'block', 
                              fontSize: '0.7rem' 
                            }}
                          >
                            Completed ({completedTodos.length})
                          </Typography>
                        )}
                        
                        {completedTodos.map((todo) => (
                          <div
                            key={todo.id}
                            draggable
                            onDragStart={handleTodoDragStart(todo)}
                            onDragOver={handleSectionDragOver(section.id)}
                            onDrop={handleTodoDrop(todo)}
                            onDragEnd={handleDragEnd}
                            style={{cursor:'grab'}}
                          >
                            <motion.div
                              layout
                              initial={{opacity:0,y:-10}}
                              animate={{opacity:1,y:0}}
                              exit={{opacity:0,y:10}}
                              transition={{duration:0.15}}
                            >
                              <ListItem
                                disablePadding
                                sx={{
                                  borderLeft: `3px solid transparent`,
                                  pl: 0.5,
                                  opacity: 0.6
                                }}
                              >
                                <ListItemButton
                                  onDoubleClick={()=>startEdit(todo)}
                                  dense
                                  sx={{ py: 0.5, borderRadius: 1 }}
                                >
                                  <Checkbox
                                    edge="start"
                                    checked={todo.done}
                                    onChange={()=>toggleDone(todo.id)}
                                    icon={<CircleIcon sx={{ fontSize: 18, opacity: 0.3 }} />}
                                    checkedIcon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
                                    tabIndex={-1}
                                    disableRipple
                                    sx={{ p: 0.5, mr: 0.5 }}
                                  />

                                  <ListItemText
                                    primary={todo.text}
                                    primaryTypographyProps={{ 
                                      variant: 'body2', 
                                      style: { 
                                        textDecoration: 'line-through',
                                        fontSize: '0.8rem'
                                      }
                                    }}
                                    sx={{ m: 0 }}
                                  />
                                  
                                  <IconButton 
                                    size="small" 
                                    onClick={()=>deleteTask(todo.id)} 
                                    sx={{ opacity: 0, transition: 'opacity 0.2s', '.MuiListItem-root:hover &': { opacity: 0.5 } }}
                                  >
                                    <DeleteIcon fontSize="small" sx={{ fontSize: 16 }}/>
                                  </IconButton>
                                </ListItemButton>
                              </ListItem>
                            </motion.div>
                          </div>
                        ))}
                      </Box>
                    )}
                  </AnimatePresence>
                </Collapse>
              </Box>
            );
          })}
        </Box>
      </Drawer>
    </AppTheme>
  );
}
