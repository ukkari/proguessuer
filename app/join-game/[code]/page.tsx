"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/supabase-provider'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from 'lucide-react'

export default function JoinGame({ params }: { params: { code: string } }) {
  const router = useRouter()
  const { supabase } = useSupabase()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [gameRoom, setGameRoom] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)
  const [userId, setUserId] = useState('')
  
  const gameCode = params.code

  useEffect(() => {
    // Get or create a userId
    const storedUserId = localStorage.getItem('userId')
    
    // Force a new userId when joining a game
    // This ensures different players get different IDs even on same browser
    const urlParams = new URLSearchParams(window.location.search);
    const forceNew = urlParams.get('new');
    
    if (forceNew === 'true') {
      console.log("Forcing new user ID for second player");
      const newUserId = crypto.randomUUID();
      localStorage.setItem('userId', newUserId);
      setUserId(newUserId);
      console.log("Generated new user ID:", newUserId);
    } else if (storedUserId) {
      console.log("Using existing user ID:", storedUserId);
      setUserId(storedUserId)
    } else {
      const newUserId = crypto.randomUUID()
      console.log("Creating initial user ID:", newUserId);
      localStorage.setItem('userId', newUserId)
      setUserId(newUserId)
    }
    
    // Check if game exists
    const checkGame = async () => {
      try {
        const { data, error } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('code', gameCode)
          .eq('status', 'waiting')
          .single()
        
        if (error || !data) {
          setNotFound(true)
          return
        }

        // Game exists and is waiting
        if (data.player1_id && data.player2_id) {
          toast({
            title: "Game is full",
            description: "This game already has two players.",
            variant: "destructive",
          })
          router.push('/')
          return
        }
        
        setGameRoom(data)
      } catch (error) {
        console.error('Error checking game:', error)
        setNotFound(true)
      }
    }
    
    checkGame()
  }, [gameCode, supabase, router, toast])

  const joinGame = async () => {
    if (!username || username.trim() === '') {
      toast({
        title: "Username required",
        description: "Please enter a username to join the game.",
        variant: "destructive",
      })
      return
    }

    if (!gameRoom) {
      toast({
        title: "Game not found",
        description: "This game doesn't exist or has already started.",
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
      
      // Update the game room to add the player
      const field = gameRoom.player1_id ? 'player2_id' : 'player1_id'
      
      const { data, error } = await supabase
        .from('game_rooms')
        .update({ [field]: userId })
        .eq('id', gameRoom.id)
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      toast({
        title: "Joined game!",
        description: "Waiting for the host to start the game.",
      })

      // Redirect to the game room
      router.push(`/game/${gameRoom.id}`)
    } catch (error) {
      console.error('Error joining game:', error)
      toast({
        title: "Failed to join game",
        description: "Please try again later.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Game Not Found</CardTitle>
            <CardDescription>
              The game with code {gameCode} does not exist or has already started.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push('/')}>
              Back to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join Game</CardTitle>
          <CardDescription>
            Join game with code: <span className="font-mono font-bold">{gameCode}</span>
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
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button className="w-full" onClick={joinGame} disabled={loading || !gameRoom}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Game"
            )}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}