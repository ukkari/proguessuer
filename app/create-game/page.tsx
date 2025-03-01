"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabase } from '@/components/supabase-provider'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { generateGameCode } from '@/lib/utils'
import { Loader2, Copy, CheckIcon } from 'lucide-react'

export default function CreateGame() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { supabase } = useSupabase()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [gameCode, setGameCode] = useState('')
  const [gameId, setGameId] = useState('')
  const [copied, setCopied] = useState(false)
  const [userId, setUserId] = useState('')
  
  const rounds = parseInt(searchParams.get('rounds') || '3')

  useEffect(() => {
    // Generate a game code
    setGameCode(generateGameCode())
    
    // Get or create a userId
    const storedUserId = localStorage.getItem('userId')
    if (storedUserId) {
      setUserId(storedUserId)
    } else {
      const newUserId = crypto.randomUUID()
      localStorage.setItem('userId', newUserId)
      setUserId(newUserId)
    }
  }, [])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(gameCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    
    toast({
      title: "Code copied to clipboard",
      description: "Share this code with your opponent to join the game.",
    })
  }

  const createGame = async () => {
    if (!username || username.trim() === '') {
      toast({
        title: "Username required",
        description: "Please enter a username to create a game.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    
    try {
      // First ensure the profile exists
      const { data: existingProfile, error: profileLookupError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (!existingProfile) {
        // Create profile if it doesn't exist
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            username,
            games_played: 0,
            games_won: 0,
          })
        
        if (insertError) {
          console.error('Error creating profile:', insertError)
          throw insertError
        }
      } else if (existingProfile.username !== username) {
        // Update username if it's different
        await supabase
          .from('profiles')
          .update({ username })
          .eq('id', userId)
      }
      
      // Then create the game room
      const { data, error } = await supabase
        .from('game_rooms')
        .insert({
          host_id: userId,
          player1_id: userId,
          code: gameCode,
          status: 'waiting',
          current_round: 1,
          total_rounds: rounds,
          player1_score: 0,
          player2_score: 0,
        })
        .select()
        .single()
      
      if (error) {
        console.error('Game room creation error:', error)
        throw error
      }
      
      setGameId(data.id)
      
      toast({
        title: "Game created!",
        description: "Waiting for another player to join.",
      })

      // Redirect to the waiting room
      router.push(`/game/${data.id}`)
    } catch (error) {
      console.error('Error creating game:', error)
      toast({
        title: "Failed to create game",
        description: "Please try again later.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create New Game</CardTitle>
          <CardDescription>
            Set up your game and invite another player
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Your Username</Label>
            <Input
              id="username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="game-code">Game Code</Label>
            <div className="flex gap-2">
              <Input
                id="game-code"
                value={gameCode}
                readOnly
                className="font-mono text-center tracking-widest"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={copyToClipboard}
                className="shrink-0"
              >
                {copied ? <CheckIcon className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this code with another player to join your game. For the best experience, have your opponent use a different browser or device. When testing with the same browser, the game will automatically create a unique user ID for the second player.
            </p>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm font-medium">Game Settings</p>
            <div className="mt-2 text-sm">
              <div className="flex justify-between">
                <span>Number of Rounds</span>
                <span>{rounds}</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={createGame} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Game"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}