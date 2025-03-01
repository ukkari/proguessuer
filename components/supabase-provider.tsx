"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

type SupabaseContext = {
  supabase: SupabaseClient<Database>
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export default function SupabaseProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [supabase] = useState(() => {
    // Use placeholder URL and key if environment variables are not set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
    
    return createClient<Database>(
      supabaseUrl,
      supabaseKey,
      {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      }
    )
  })

  useEffect(() => {
    // Check if Supabase credentials are properly set
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co'
    ) {
      console.warn('Supabase credentials not properly set. Please connect to Supabase via the Connect button.')
    }
  }, [])

  return (
    <Context.Provider value={{ supabase }}>
      {children}
    </Context.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useSupabase must be used inside SupabaseProvider')
  }
  return context
}