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
  InputBase,
  Tooltip,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
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
import SortIcon from '@mui/icons-material/Sort';
import NotesIcon from '@mui/icons-material/Notes';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { AnimatePresence, motion } from 'framer-motion';
import AppTheme, { ColorModeContext, ThemeToggle } from './theme';
import useTodos from './hooks/useTodos';

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

const DEFAULT_SECTIONS: Section[] = [
  { id: 'today', name: 'Today', expanded: true },
  { id: 'later', name: 'Later', expanded: true }
];

const PRIORITY_COLORS: Record<Todo['priority'], string> = {
  high: 'rgba(239, 68, 68, 0.7)',   // Softer red
  medium: 'rgba(245, 158, 11, 0.7)', // Softer amber
  low: 'rgba(16, 185, 129, 0.7)'     // Softer green
};

// Theme-aware priority colors
const getPriorityColor = (priority: Todo['priority'], isDark: boolean): string => {
  const colors = {
    high: {
      light: 'rgba(239, 68, 68, 0.7)',
      dark: 'rgba(248, 113, 113, 0.7)'
    },
    medium: {
      light: 'rgba(245, 158, 11, 0.7)',
      dark: 'rgba(251, 191, 36, 0.7)'
    },
    low: {
      light: 'rgba(16, 185, 129, 0.7)',
      dark: 'rgba(52, 211, 153, 0.7)'
    }
  };
  
  return colors[priority][isDark ? 'dark' : 'light'];
};

export default function App() {
  const colorMode = useContext(ColorModeContext);
  const { 
    todos, 
    setTodos, 
    sections, 
    setSections, 
    sortMethod, 
    setSortMethod 
  } = useTodos();

  // New‐task inputs
  const [newTask, setNewTask] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<Todo['priority']>('medium');
  const [newSection, setNewSection] = useState<string>(sections[0]?.id || 'today');
  
  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  
  // UI states
  const [showDescription, setShowDescription] = useState<number | null>(null);

  // Add state for drag over section
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);

  // Description field ref
  const descriptionFieldRef = React.useRef<HTMLDivElement>(null);

  // Section management state
  const [sectionMenuAnchor, setSectionMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [isRenamingSectionId, setIsRenamingSectionId] = useState<string | null>(null);
  const [showAddSectionDialog, setShowAddSectionDialog] = useState(false);

  // Handle clicks outside description field
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (descriptionFieldRef.current && !descriptionFieldRef.current.contains(event.target as Node)) {
        // Only close if clicking outside the new task area
        const taskArea = document.querySelector('.new-task-area');
        if (taskArea && !taskArea.contains(event.target as Node)) {
          setNewDescription('');
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    
    const newTodo: Todo = {
      id: Date.now(),
      text,
      description: newDescription.trim(),
      done: false,
      priority: newPriority,
      section: newSection,
      createdAt: Date.now()
    };
    
    setTodos(ts => [...ts, newTodo]);
    setNewTask('');
    setNewDescription('');
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
    setEditDescription(todo.description);
  };

  // Finish editing
  const finishEdit = () => {
    if (editingId === null) return;
    const text = editText.trim();
    if (text) {
      setTodos(ts => ts.map(t => t.id === editingId ? { 
        ...t, 
        text,
        description: editDescription.trim()
      } : t));
    }
    setEditingId(null);
    setEditText('');
    setEditDescription('');
  };

  // Toggle showing description
  const toggleShowDescription = (id: number | null) => {
    setShowDescription(showDescription === id ? null : id);
  };

  // Toggle section expanded/collapsed
  const toggleSection = (sectionId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, expanded: !s.expanded } : s
    ));
  };

  // Handle section menu
  const handleSectionMenuOpen = (event: React.MouseEvent<HTMLElement>, sectionId: string) => {
    event.stopPropagation();
    setActiveSectionId(sectionId);
    setSectionMenuAnchor(event.currentTarget);
  };

  const handleSectionMenuClose = () => {
    setSectionMenuAnchor(null);
    setActiveSectionId(null);
  };

  // Section operations
  const startRenamingSection = () => {
    const section = sections.find(s => s.id === activeSectionId);
    if (section) {
      setNewSectionName(section.name);
      setIsRenamingSectionId(activeSectionId);
    }
    handleSectionMenuClose();
  };

  const finishRenamingSection = () => {
    if (!newSectionName.trim() || !isRenamingSectionId) return;
    
    setSections(sections.map(s => 
      s.id === isRenamingSectionId 
        ? { ...s, name: newSectionName.trim() }
        : s
    ));
    
    setIsRenamingSectionId(null);
    setNewSectionName('');
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    setSections(prevSections => {
      const index = prevSections.findIndex(s => s.id === sectionId);
      if (index === -1) return prevSections;
      
      const newSections = [...prevSections];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (newIndex < 0 || newIndex >= newSections.length) return prevSections;
      
      // Swap sections
      [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
      return newSections;
    });
    handleSectionMenuClose();
  };

  // Add new section dialog
  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    
    const newId = newSectionName.toLowerCase().replace(/\s+/g, '-');
    
    if (sections.some(s => s.id === newId)) {
      alert('A section with a similar name already exists.');
      return;
    }
    
    setSections([
      ...sections,
      { id: newId, name: newSectionName.trim(), expanded: true }
    ]);
    
    setNewSectionName('');
    setShowAddSectionDialog(false);
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
        {/* Header with Add Section Button */}
        <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 500, letterSpacing: '-0.01em' }}>Tasks</Typography>
          
          <Tooltip title="Add new section">
            <IconButton 
              size="small" 
              onClick={() => setShowAddSectionDialog(true)}
              sx={{ opacity: 0.6 }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {/* Sorting Dropdown */}
          <Tooltip title="Sort Tasks">
            <IconButton 
              size="small" 
              onClick={(e) => {
                // Cycle through sort methods
                if (sortMethod === 'none') setSortMethod('priority');
                else if (sortMethod === 'priority') setSortMethod('createdAt');
                else setSortMethod('none');
              }}
              sx={{ 
                opacity: 0.6,
                color: sortMethod !== 'none' ? 'primary.main' : 'inherit'
              }}
            >
              <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LabelIcon fontSize="small" />
                {sortMethod !== 'none' && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      position: 'absolute', 
                      fontSize: '8px', 
                      bottom: -8, 
                      width: '100%', 
                      textAlign: 'center',
                      opacity: 0.8
                    }}
                  >
                    {sortMethod === 'priority' ? 'PRIO' : 'NEW'}
                  </Typography>
                )}
              </Box>
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Toggle theme">
            <Box>
              <ThemeToggle />
            </Box>
          </Tooltip>
          <Tooltip title="Minimize">
            <IconButton size="small" onClick={() => window.electronAPI.hideWindow()} sx={{ opacity: 0.6 }}>
              <MinimizeIcon fontSize="inherit"/>
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton size="small" onClick={() => window.electronAPI.closeWindow()} sx={{ opacity: 0.6 }}>
              <CloseIcon fontSize="inherit"/>
            </IconButton>
          </Tooltip>
        </Box>
        <Divider />

        {/* Add New Task - Simplified */}
        <Box className="new-task-area" sx={{ p: 1.5, pt: 2 }}>
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
                  <CircleIcon sx={{ color: getPriorityColor('high', colorMode.isDark), fontSize: 10, mr: 1 }} />
                  High
                </MenuItem>
                <MenuItem value="medium">
                  <CircleIcon sx={{ color: getPriorityColor('medium', colorMode.isDark), fontSize: 10, mr: 1 }} />
                  Medium
                </MenuItem>
                <MenuItem value="low">
                  <CircleIcon sx={{ color: getPriorityColor('low', colorMode.isDark), fontSize: 10, mr: 1 }} />
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
              onKeyDown={e=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault();addTask();}}}
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  transition: 'all 0.3s'
                },
                '& .MuiOutlinedInput-root:hover': {
                  boxShadow: colorMode.isDark ? '0 0 8px rgba(255,255,255,0.1)' : '0 0 8px rgba(0,0,0,0.1)'
                }
              }}
              InputProps={{
                endAdornment: (
                  <Tooltip title={newDescription && newDescription.trim() !== '' && newDescription !== ' ' ? "Hide description" : "Add description"}>
                    <div>
                      <IconButton 
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // If there's actual content, keep it open
                          if (newDescription && newDescription.trim() !== '' && newDescription !== ' ') {
                            setNewDescription('');  // Clear and close
                          } else {
                            // If empty or just placeholder space, toggle
                            setNewDescription(newDescription ? '' : ' ');
                          }
                        }}
                        size="small" 
                        sx={{ 
                          opacity: newDescription && newDescription.trim() !== '' && newDescription !== ' ' ? 0.9 : 0.4,
                          transform: newDescription ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }}
                      >
                        <ExpandMoreIcon fontSize="inherit"/>
                      </IconButton>
                    </div>
                  </Tooltip>
                )
              }}
            />
            <IconButton onClick={addTask} sx={{ opacity: 0.7 }}>
              <AddIcon />
            </IconButton>
          </Box>
          
          {/* Description field */}
          <Collapse in={!!newDescription}>
            <Box 
              ref={descriptionFieldRef}
              sx={{ mt: 1, mb: 1 }}
              onMouseDown={e => e.stopPropagation()}
              onMouseUp={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              onDoubleClick={e => e.stopPropagation()}
            >
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                placeholder="Add description (optional)..."
                value={newDescription === ' ' ? '' : newDescription}
                onChange={e => setNewDescription(e.target.value)}
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addTask();
                  }
                }}
                onFocus={e => e.stopPropagation()}
                onBlur={e => {
                  e.stopPropagation();
                  // If description is empty or just whitespace, close it
                  if (!newDescription || newDescription.trim() === '' || newDescription === ' ') {
                    setNewDescription('');
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    fontSize: '0.8rem',
                    transition: 'all 0.3s'
                  },
                  '& .MuiOutlinedInput-root:hover': {
                    boxShadow: colorMode.isDark ? '0 0 8px rgba(255,255,255,0.1)' : '0 0 8px rgba(0,0,0,0.1)'
                  }
                }}
              />
            </Box>
          </Collapse>
        </Box>

        {/* Sections List with Management */}
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
                  bgcolor: 'background.paper',
                  transition: 'all 0.3s ease',
                  boxShadow: colorMode.isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                {/* Section Header with Management */}
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
                  
                  {isRenamingSectionId === section.id ? (
                    <TextField
                      size="small"
                      value={newSectionName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSectionName(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          finishRenamingSection();
                        }
                      }}
                      onBlur={finishRenamingSection}
                      autoFocus
                      sx={{ 
                        marginLeft: 1, 
                        flexGrow: 1,
                        '& .MuiInputBase-input': {
                          fontSize: '0.875rem',
                          paddingY: 0.5
                        }
                      }}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    />
                  ) : (
                    <>
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
                      </Typography>
                      
                      <IconButton
                        size="small"
                        onClick={(e) => handleSectionMenuOpen(e, section.id)}
                        sx={{ 
                          opacity: 0.4,
                          '&:hover': { opacity: 0.7 },
                          ml: 1
                        }}
                      >
                        <MoreVertIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </>
                  )}
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
                              borderLeft: `3px solid ${getPriorityColor(todo.priority, colorMode.isDark)}`,
                              pl: 0.5,
                              transition: 'all 0.2s ease'
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
                                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                  <TextField
                                    value={editText}
                                    size="small"
                                    fullWidth
                                    autoFocus
                                    onChange={e=>setEditText(e.target.value)}
                                    onKeyDown={e=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault();finishEdit();}}}
                                  />
                                  <TextField
                                    value={editDescription}
                                    size="small"
                                    fullWidth
                                    multiline
                                    rows={2}
                                    placeholder="Description (optional)"
                                    onChange={e=>setEditDescription(e.target.value)}
                                    sx={{ 
                                      mt: 1, 
                                      '& .MuiInputBase-input': {
                                        fontSize: '0.8rem'
                                      }
                                    }}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        finishEdit();
                                      }
                                    }}
                                  />
                                </Box>
                              ) : (
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                                  
                                  {/* Description toggle & display */}
                                  {todo.description && (
                                    <>
                                      <Box 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleShowDescription(todo.id);
                                        }}
                                        sx={{ 
                                          display: 'flex', 
                                          alignItems: 'center',
                                          mt: 0.5,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        <Typography 
                                          variant="caption" 
                                          sx={{ 
                                            color: 'text.secondary',
                                            fontSize: '0.7rem',
                                            mr: 0.5
                                          }}
                                        >
                                          Notes
                                        </Typography>
                                        {showDescription === todo.id ? (
                                          <ExpandLessIcon sx={{ fontSize: 12, opacity: 0.7 }} />
                                        ) : (
                                          <ExpandMoreIcon sx={{ fontSize: 12, opacity: 0.7 }} />
                                        )}
                                      </Box>
                                      
                                      <Collapse in={showDescription === todo.id}>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontSize: '0.75rem',
                                            color: 'text.secondary',
                                            py: 0.5,
                                            px: 1,
                                            mt: 0.5,
                                            borderRadius: 1,
                                            backgroundColor: colorMode.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                          }}
                                        >
                                          {todo.description}
                                        </Typography>
                                      </Collapse>
                                    </>
                                  )}
                                </Box>
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

        {/* Section Menu */}
        <Menu
          anchorEl={sectionMenuAnchor}
          open={Boolean(sectionMenuAnchor)}
          onClose={handleSectionMenuClose}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem onClick={startRenamingSection}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Rename</ListItemText>
          </MenuItem>
          <MenuItem 
            onClick={() => moveSection(activeSectionId!, 'up')}
            disabled={sections.findIndex(s => s.id === activeSectionId) === 0}
          >
            <ListItemIcon>
              <ArrowUpwardIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Move Up</ListItemText>
          </MenuItem>
          <MenuItem 
            onClick={() => moveSection(activeSectionId!, 'down')}
            disabled={sections.findIndex(s => s.id === activeSectionId) === sections.length - 1}
          >
            <ListItemIcon>
              <ArrowDownwardIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Move Down</ListItemText>
          </MenuItem>
          <MenuItem 
            onClick={() => {
              handleSectionMenuClose();
              deleteSection(activeSectionId!);
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>

        {/* Add Section Dialog */}
        <Dialog 
          open={showAddSectionDialog} 
          onClose={() => {
            setShowAddSectionDialog(false);
            setNewSectionName('');
          }}
        >
          <DialogTitle>Add New Section</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Section Name"
              fullWidth
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddSection();
                }
              }}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: '0.875rem'
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem'
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setShowAddSectionDialog(false);
              setNewSectionName('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddSection} variant="contained" disabled={!newSectionName.trim()}>
              Add
            </Button>
          </DialogActions>
        </Dialog>
      </Drawer>
    </AppTheme>
  );
}
