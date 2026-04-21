import { useEffect, useRef } from 'react'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type Handler = (record: Record<string, unknown>) => void

interface UseRealtimeOptions {
  table: string
  filterColumn: string
  filterValue: string
  onInsert?: Handler
  onUpdate?: Handler
  onDelete?: Handler
  enabled?: boolean
}

export function useRealtime({
  table,
  filterColumn,
  filterValue,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  const onDeleteRef = useRef(onDelete)

  onInsertRef.current = onInsert
  onUpdateRef.current = onUpdate
  onDeleteRef.current = onDelete

  useEffect(() => {
    if (!enabled || !filterValue) return

    const channelName = `${table}:${filterColumn}:${filterValue}`

    channelRef.current = supabase
      .channel(channelName)
      .on<Record<string, unknown>>(
        'postgres_changes' as 'system',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `${filterColumn}=eq.${filterValue}`,
        } as { event: string },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          switch (payload.eventType) {
            case 'INSERT':
              onInsertRef.current?.(payload.new)
              break
            case 'UPDATE':
              onUpdateRef.current?.(payload.new)
              break
            case 'DELETE':
              onDeleteRef.current?.(payload.old)
              break
          }
        },
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [table, filterColumn, filterValue, enabled])
}

export function useExpenseRealtime(
  notebookId: string,
  callbacks: {
    onInsert?: Handler
    onUpdate?: Handler
    onDelete?: Handler
  },
) {
  useRealtime({
    table: 'expenses',
    filterColumn: 'notebook_id',
    filterValue: notebookId,
    ...callbacks,
  })
}

export function useSettlementRealtime(
  notebookId: string,
  callbacks: {
    onInsert?: Handler
    onUpdate?: Handler
    onDelete?: Handler
  },
) {
  useRealtime({
    table: 'settlements',
    filterColumn: 'notebook_id',
    filterValue: notebookId,
    ...callbacks,
  })
}
