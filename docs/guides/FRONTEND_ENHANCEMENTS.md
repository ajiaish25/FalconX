# FalconX Frontend Enhancements Guide

## 🚀 Advanced UI Implementation Guide

This guide walks you through implementing all the advanced frontend features for FalconX without breaking existing code.

---

## 📦 Installation Step

### 1. Install Core Dependencies

```bash
cd frontend
npm install socket.io-client zustand cmdk react-aria @sentry/nextjs
```

### 2. Install Optional Advanced Features (Choose What You Need)

```bash
# For advanced visualizations
npm install visx nivo react-three-fiber three

# For advanced tables and filtering
npm install react-table react-select react-date-range

# For forms and validation
npm install react-hook-form zod

# For drag & drop dashboards
npm install dnd-kit @dnd-kit/core @dnd-kit/utilities @dnd-kit/sortable

# For rich text editing
npm install tiptap @tiptap/react @tiptap/starter-kit prism-react-renderer
```

---

## 🎯 Component Implementation Guide

### 1. Command Palette (Cmd+K)

**Location:** `frontend/app/components/CommandPalette.tsx` ✅ **Already Created**

**Integration Steps:**

1. Add to your main layout or app component:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { CommandPalette } from './components/CommandPalette'
import type { Command } from './components/CommandPalette'

export default function Layout() {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)

  // Example commands
  const commands: Command[] = [
    {
      id: 'dashboard',
      title: 'Go to Dashboard',
      description: 'View analytics dashboard',
      category: 'navigation',
      keywords: ['dashboard', 'analytics', 'view'],
      hotkey: 'Cmd+D',
      onSelect: () => window.location.href = '/dashboard'
    },
    {
      id: 'export',
      title: 'Export Data',
      description: 'Export current data as CSV or Excel',
      category: 'export',
      keywords: ['export', 'download', 'csv'],
      onSelect: () => { /* export logic */ }
    },
    // Add more commands...
  ]

  // Open with Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsPaletteOpen(!isPaletteOpen)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPaletteOpen])

  return (
    <>
      <CommandPalette 
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        commands={commands}
      />
      {/* Your layout content */}
    </>
  )
}
```

---

### 2. Notification Center

**Location:** `frontend/app/components/NotificationCenter.tsx` ✅ **Already Created**

**Integration Steps:**

1. Add to Header or Navigation:

```tsx
'use client'

import { useState, useCallback } from 'react'
import { NotificationCenter, type Notification } from './components/NotificationCenter'

export function Header() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const handleMarkAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const handleClear = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return (
    <header className="flex items-center justify-between">
      {/* Other header content */}
      <NotificationCenter
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onClear={handleClear}
        onClearAll={() => setNotifications([])}
      />
    </header>
  )
}
```

**Example: Adding Notifications**

```tsx
const addNotification = () => {
  const newNotif: Notification = {
    id: `notif-${Date.now()}`,
    type: 'success',
    title: 'Data Exported',
    message: 'Your data has been exported as CSV',
    timestamp: new Date(),
    read: false,
    action: {
      label: 'Download',
      onClick: () => console.log('Download clicked')
    }
  }
  setNotifications(prev => [newNotif, ...prev])
}
```

---

### 3. Advanced Table Component

**Location:** `frontend/app/components/AdvancedTable.tsx` ✅ **Already Created**

**Integration Steps:**

```tsx
import { AdvancedTable, type TableColumn } from './components/AdvancedTable'

interface ProjectData {
  id: string
  name: string
  status: 'active' | 'pending' | 'completed'
  progress: number
  team: string
}

export function ProjectsTable() {
  const [projects, setProjects] = useState<ProjectData[]>([
    { id: '1', name: 'Project A', status: 'active', progress: 75, team: 'Team A' },
    // ... more projects
  ])

  const columns: TableColumn<ProjectData>[] = [
    {
      key: 'name',
      label: 'Project Name',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          value === 'active' ? 'bg-green-100 text-green-800' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'progress',
      label: 'Progress',
      sortable: true,
      render: (value) => (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full" 
            style={{ width: `${value}%` }}
          />
        </div>
      ),
    },
    {
      key: 'team',
      label: 'Assigned Team',
      sortable: true,
    },
  ]

  return (
    <AdvancedTable
      columns={columns}
      data={projects}
      searchable={true}
      sortable={true}
      pageSize={10}
      onRowClick={(row) => console.log('Clicked:', row)}
    />
  )
}
```

---

### 4. State Management with Zustand

**Location:** `frontend/app/hooks/useAppStore.ts`

**To Enable:**

1. Uncomment the Zustand code in `useAppStore.ts`

```tsx
npm install zustand
```

2. Update the file:

```tsx
'use client'

import { create } from 'zustand'
import type { Notification } from '../components/NotificationCenter'

interface AppState {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  // ... other state
}

export const useAppStore = create<AppState>((set) => ({
  // ... implementation
}))
```

---

## 🎨 Additional Enhancements (Modular)

### WebSocket Real-Time Updates

```tsx
'use client'

import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

export function useRealTimeData() {
  const [data, setData] = useState(null)

  useEffect(() => {
    const socket = io('http://localhost:8000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    socket.on('data-update', (newData) => {
      setData(newData)
    })

    return () => socket.disconnect()
  }, [])

  return data
}
```

### Error Boundary

```tsx
'use client'

import { useState } from 'react'

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <h2 className="text-red-800 font-bold">Something went wrong</h2>
        <button
          onClick={() => setHasError(false)}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
        >
          Try Again
        </button>
      </div>
    )
  }

  return children
}
```

---

## 📊 Advanced Visualization Examples

### 1. Using Recharts (Already Installed)

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

const data = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 200 },
]

export function BasicChart() {
  return (
    <BarChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="value" fill="#8884d8" />
    </BarChart>
  )
}
```

### 2. Using Nivo (Optional - Install if needed)

```tsx
// After: npm install nivo
import { ResponsiveBar } from '@nivo/bar'

const data = [
  { id: 'Jan', value: 400 },
  { id: 'Feb', value: 300 },
  { id: 'Mar', value: 200 },
]

export function NivoChart() {
  return (
    <ResponsiveBar
      data={data}
      keys={['value']}
      indexBy="id"
      margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
      colors={['#8884d8']}
    />
  )
}
```

---

## 🔒 TypeScript Support

All new components have full TypeScript support with proper types:

```tsx
// Type-safe table
import type { TableColumn } from './components/AdvancedTable'

// Type-safe notifications
import type { Notification } from './components/NotificationCenter'

// Type-safe commands
import type { Command } from './components/CommandPalette'
```

---

## 🚀 Performance Optimizations

### 1. Code Splitting

```tsx
import dynamic from 'next/dynamic'

const CommandPalette = dynamic(
  () => import('./components/CommandPalette'),
  { loading: () => <div>Loading...</div> }
)
```

### 2. Image Optimization

```tsx
import Image from 'next/image'

<Image
  src="/dashboard.jpg"
  alt="Dashboard"
  width={600}
  height={400}
  priority // For above-the-fold
  placeholder="blur" // LQIP
/>
```

### 3. Virtual Scrolling for Large Lists

```tsx
// Use with react-window for very large datasets
import { FixedSizeList } from 'react-window'

export function VirtualList({ items }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={35}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>{items[index]}</div>
      )}
    </FixedSizeList>
  )
}
```

---

## 📋 Implementation Checklist

- [ ] Install dependencies with `npm install`
- [ ] Enable CommandPalette in layout
- [ ] Integrate NotificationCenter in Header
- [ ] Add AdvancedTable to data views
- [ ] Setup Zustand store (optional)
- [ ] Add WebSocket integration (optional)
- [ ] Implement error boundaries
- [ ] Test all features
- [ ] Deploy and monitor

---

## 🎯 Next Steps

1. **Start with basics:** Command Palette + Notifications
2. **Add tables:** Replace existing data tables with AdvancedTable
3. **Real-time:** Implement WebSocket updates
4. **Advanced charts:** Add Nivo or Visx visualizations
5. **Dashboards:** Add drag-and-drop dashboard customization

---

## 🆘 Troubleshooting

### "Module not found" errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Type errors with new components

```bash
# Rebuild TypeScript
npx tsc --noEmit
```

### Performance issues

- Use `React.memo()` to prevent unnecessary re-renders
- Implement virtualization for large lists
- Use code splitting with `dynamic()`
- Monitor bundle size with `npm run build`

---

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Best Practices](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui Components](https://ui.shadcn.com)

---

**All enhancements are backward compatible and don't break existing code!** ✅
