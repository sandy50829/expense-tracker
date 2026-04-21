import { useEffect, useRef } from 'react'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface UseRealtimeOptions {
  table: string
  filterColumn: string
  filterValue: string
  onInsert?: (record: Record<string, unknown>) => void
  onUpdate?: (record: Record<string, unknown>) => void
  onDelete?: (oldRecord: Record<string, unknown>) => void
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
              onInsert?.(payload.new)
              break
            case 'UPDATE':
              onUpdate?.(payload.new)
              break
            case 'DELETE':
              onDelete?.(payload.old)
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
  }, [table, filterColumn, filterValue, enabled, onInsert, onUpdate, onDelete])
}

export function useExpenseRealtime(
  notebookId: string,
  callbacks: {
    onInsert?: (record: Record<string, unknown>) => void
    onUpdate?: (record: Record<string, unknown>) => void
    onDelete?: (oldRecord: Record<string, unknown>) => void
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
    onInsert?: (record: Record<string, unknown>) => void
    onUpdate?: (record: Record<string, unknown>) => void
    onDelete?: (oldRecord: Record<string, unknown>) => void
  },
) {
  useRealtime({
    table: 'settlements',
    filterColumn: 'notebook_id',
    filterValue: notebookId,
    ...callbacks,
  })
}
