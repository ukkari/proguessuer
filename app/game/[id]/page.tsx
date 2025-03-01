"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/supabase-provider'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Clock, Circle, Trophy, Github } from 'lucide-react'
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatTime } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { CodeDisplay } from '@/components/ui/code-display'

export default function GameRoom({ params }: { params: { id: string } }) {
  const gameId = params.id
  const router = useRouter()
  const { supabase } = useSupabase()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [gameData, setGameData] = useState<any>(null)
  const [players, setPlayers] = useState<any>({})
  const [currentRound, setCurrentRound] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [answer, setAnswer] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [userId, setUserId] = useState('')
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null)
  const [submittedAnswer, setSubmittedAnswer] = useState(false)
  
  // Fetch players separately
  const fetchPlayers = async (gameRoom: any) => {
    const playerIds = [gameRoom.player1_id, gameRoom.player2_id].filter(Boolean)
    
    if (playerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', playerIds)
      
      if (profiles) {
        console.log("Fetched player profiles:", profiles)
        const playersMap: any = {}
        profiles.forEach(profile => {
          playersMap[profile.id] = profile
        })
        setPlayers(playersMap)
      }
    }
  }
  
  // Fetch current round separately - improved error handling
  const fetchCurrentRound = async (gameRoomId: string, roundNumber: number) => {
    try {
      // Don't fetch rounds if the game hasn't started yet
      if (roundNumber <= 0) return null
      
      const { data: round, error } = await supabase
        .from('rounds')
        .select('*')
        .eq('game_room_id', gameRoomId)
        .eq('round_number', roundNumber)
        .single()
      
      if (error) {
        // Log as regular message if round hasn't been created yet
        if (error.code === 'PGRST116') {
          console.log(`Round ${roundNumber} not created yet for game ${gameRoomId}`);
        } else {
          console.error('Error fetching round:', error)
        }
        return;
      }
      
      if (round) {
        console.log("Fetched current round:", round)
        setCurrentRound(round)
        setTimeLeft(round.time_limit)
        
        // Only reset state if needed (if different from current round or during initialization)
        if (!currentRound || currentRound.round_number !== round.round_number) {
          console.log("New round detected, checking existing answers")
          
          // Check for existing answers
          if (playerNumber === 1 && round.player1_answer) {
            setSubmittedAnswer(true)
            setAnswer(round.player1_answer)
          } else if (playerNumber === 2 && round.player2_answer) {
            setSubmittedAnswer(true)
            setAnswer(round.player2_answer)
          } else if (round.status === 'active') {
            // For new rounds, only reset submittedAnswer
            setSubmittedAnswer(false)
            // Don't clear the answer input to preserve what the user is typing
          }
        }
      }
    } catch (err) {
      console.error('Error in fetchCurrentRound:', err)
    }
  }
  
  // Fetch game data - moved outside to be accessible anywhere in the component
  const fetchGameData = async () => {
    try {
      if (!userId) {
        console.error("Cannot fetch game data: userId not set")
        return
      }
      
      console.log("Fetching game data with userId:", userId)
      const { data: gameRoom, error } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', gameId)
        .single()
      
      if (error || !gameRoom) {
        toast({
          title: "Game not found",
          description: "This game doesn't exist or has ended.",
          variant: "destructive",
        })
        router.push('/')
        return
      }
      
      console.log("Fetched game data:", gameRoom)
      setGameData(gameRoom)
      setIsHost(gameRoom.host_id === userId)
      
      // Determine player number
      if (gameRoom.player1_id === userId) {
        console.log("This user is Player 1")
        setPlayerNumber(1)
      } else if (gameRoom.player2_id === userId) {
        console.log("This user is Player 2")
        setPlayerNumber(2)
      } else {
        console.log("User not authorized in this game:", userId)
        console.log("Player1 ID:", gameRoom.player1_id)
        console.log("Player2 ID:", gameRoom.player2_id)
        toast({
          title: "Not authorized",
          description: "You are not a participant in this game.",
          variant: "destructive",
        })
        router.push('/')
        return
      }

      // Fetch profiles for both players
      await fetchPlayers(gameRoom)
      
      // If game is in 'playing' status, fetch current round
      if (gameRoom.status === 'playing') {
        await fetchCurrentRound(gameRoom.id, gameRoom.current_round)
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching game data:', error)
      toast({
        title: "Error",
        description: "Failed to load game data.",
        variant: "destructive",
      })
      router.push('/')
    }
  }
  
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    if (!storedUserId) {
      router.push('/')
      return
    }
    
    console.log("Current user ID:", storedUserId);
    console.log("localStorage check - userId:", localStorage.getItem('userId'));
    
    // Set userId first, then fetch data in a separate effect
    setUserId(storedUserId)
    
    // Check URL for force new parameter
    const urlParams = new URLSearchParams(window.location.search);
    const forceNew = urlParams.get('new');
    
    if (forceNew === 'true') {
      console.log("Force new user ID flag detected in game page");
      // This would ensure a new player gets a new ID
      // Normally handled in join-game page, but this is a fallback
    }
  }, [router]) // Only depend on router
  
  // Separate effect for fetching data after userId is set
  useEffect(() => {
    // Only run this effect if userId is set
    if (!userId) return
    
    console.log("Starting data fetch with userId:", userId)
    
    // Initial data load
    fetchGameData()
    
    // Set up polling for game data
    const polling = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log("Polling for latest game data...")
        fetchGameData()
      }
    }, 5000) // Poll every 5 seconds as a fallback
    
    // Set up realtime subscription with enhanced handling
    const gameSubscription = supabase
      .channel(`game_room:${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${gameId}`
      }, async (payload) => {
        console.log("Game room update received:", payload.new, "Old:", payload.old)
        
        // Always update local state with latest data
        setGameData(payload.new)
        
        // Trigger full refresh if important data changed
        if (
          // If player2 joined the game
          (!payload.old.player2_id && payload.new.player2_id) ||
          // If game status changed
          (payload.old.status !== payload.new.status) ||
          // If current round changed
          (payload.old.current_round !== payload.new.current_round)
        ) {
          console.log("Important game state change detected, refreshing all data")
          
          // Update players immediately if player2 joined
          if (!payload.old.player2_id && payload.new.player2_id) {
            await fetchPlayers(payload.new)
          }
          
          // When the current round has changed
          if (payload.old.current_round !== payload.new.current_round) {
            console.log("Round number changed, resetting answer state")
            // Make sure to reset answer state when the round changes
            setSubmittedAnswer(false)
            
            // Clear input content for non-host players
            if (!isHost) {
              console.log("Non-host player, clearing answer input")
              setAnswer('')
            }
            
            // Update round immediately if round changed
            console.log("Fetching new round data after game change")
            await fetchCurrentRound(payload.new.id, payload.new.current_round)
          }
          
          // Update state when game status changes
          if (payload.old.status !== payload.new.status && payload.new.status === 'playing') {
            console.log("Game status changed to playing, fetching initial round")
            setSubmittedAnswer(false)
            // Don't clear input content - preserve what the user is typing to prevent unnecessary clearing
            await fetchCurrentRound(payload.new.id, payload.new.current_round)
          }
          
          // Ensure we have the most up to date game data
          setTimeout(() => {
            fetchGameData()
          }, 300)
        }
      })
      .subscribe((status) => {
        console.log("Game subscription status:", status)
      })
    
    // Improved rounds subscription with better error handling and more frequent polling
    const roundsSubscription = supabase
      .channel(`rounds:${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rounds',
        filter: `game_room_id=eq.${gameId}`
      }, async (payload) => {
        console.log("Round update received:", payload.new, payload.old)
        
        try {
          // Always fetch the latest round data to ensure we have the most up-to-date info
          const { data: latestRound, error } = await supabase
            .from('rounds')
            .select('*')
            .eq('id', payload.new.id)
            .single()
            
          if (error) throw error
          
          if (latestRound) {
            console.log("Latest round data after update:", latestRound)
            
            // Update rounds data regardless of round number
            setCurrentRound((prevRound: any) => {
              // Only update if it's the current round or we don't have a round yet
              if (!prevRound || prevRound.id === latestRound.id) {
                return latestRound
              }
              return prevRound
            })
            
            // Update submission states based on the fresh data
            if (playerNumber === 1 && latestRound.player1_answer) {
              console.log("Player 1 answer is submitted in database")
              setSubmittedAnswer(true)
              setAnswer(latestRound.player1_answer)
            } else if (playerNumber === 2 && latestRound.player2_answer) {
              console.log("Player 2 answer is submitted in database")
              setSubmittedAnswer(true)
              setAnswer(latestRound.player2_answer)
            }
            
            // Log the current submission states for debugging
            console.log("Player 1 submitted:", !!latestRound.player1_answer)
            console.log("Player 2 submitted:", !!latestRound.player2_answer)
            
            // Status changed
            if (payload.old.status !== latestRound.status) {
              console.log("Round status changed", payload.old.status, "->", latestRound.status)
              
              // If round status changed to completed or evaluating, fetch game data again
              // to ensure scores are up to date
              if (latestRound.status === 'completed' || latestRound.status === 'evaluating') {
                setTimeout(() => fetchGameData(), 300)
              }
              
              // Reset submitted state if new round is starting
              if (latestRound.status === 'active' && payload.old.status === 'completed') {
                console.log("Resetting answer state for new round")
                setSubmittedAnswer(false)
                
                // Clear input content for non-host players
                if (!isHost) {
                  console.log("Non-host player, clearing answer on new round")
                  setAnswer('')
                }
              }
            }
          }
        } catch (err) {
          console.error("Error processing round update:", err)
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rounds',
        filter: `game_room_id=eq.${gameId}`
      }, async (payload) => {
        console.log("New round created:", payload.new)
        
        try {
          // We have a new round, let's make sure we have the latest game data first
          await fetchGameData()
          
          // Then specifically fetch this new round
          const { data: newRound, error } = await supabase
            .from('rounds')
            .select('*')
            .eq('id', payload.new.id)
            .single()
            
          if (error) throw error
          
          if (newRound) {
            console.log("Setting new round data:", newRound)
            setCurrentRound(newRound)
            setTimeLeft(newRound.time_limit)
            // Always reset submitted state for ALL players when a new round is created
            setSubmittedAnswer(false)
            
            // Clear input content for non-host players
            if (!isHost) {
              console.log("Non-host player, clearing answer on new round creation")
              setAnswer('')
            }
          }
        } catch (err) {
          console.error("Error processing new round:", err)
        }
      })
      .subscribe((status) => {
        console.log("Rounds subscription status:", status)
      })
    
    // Cleanup function
    return () => {
      clearInterval(polling)
      gameSubscription.unsubscribe()
      roundsSubscription.unsubscribe()
    }
  }, [userId, gameId, supabase, playerNumber])
  
  // Fix dependencies
  useEffect(() => {
    // Only check when both game data and current round exist
    if (gameData?.status === 'playing' && gameData?.current_round && currentRound) {
      // There's a data inconsistency if round numbers don't match, force update
      if (gameData.current_round !== currentRound.round_number) {
        console.log("Round mismatch detected in useEffect:", 
          "game shows round", gameData.current_round, 
          "but current round is", currentRound.round_number);
        
        // Only reset submission status
        setSubmittedAnswer(false);
        
        // Clear input content for non-host players
        if (!isHost) {
          console.log("Non-host player, clearing answer input on round mismatch")
          setAnswer('')
        }
        
        // Get the correct round - avoid dependency on fetchCurrentRound
        const fetchCorrectRound = async () => {
          try {
            const { data: round, error } = await supabase
              .from('rounds')
              .select('*')
              .eq('game_room_id', gameId)
              .eq('round_number', gameData.current_round)
              .single()
            
            if (error) {
              console.error('Error fetching correct round:', error)
              return
            }
            
            if (round) {
              console.log("Fetched correct round:", round)
              setCurrentRound(round)
              setTimeLeft(round.time_limit)
              
              // Check for existing answers
              if (playerNumber === 1 && round.player1_answer) {
                setSubmittedAnswer(true)
                setAnswer(round.player1_answer)
              } else if (playerNumber === 2 && round.player2_answer) {
                setSubmittedAnswer(true)
                setAnswer(round.player2_answer)
              } else if (round.status === 'active') {
                // For new rounds, only reset submittedAnswer
                setSubmittedAnswer(false)
                // Don't clear the answer input to preserve what the user is typing
              }
            }
          } catch (err) {
            console.error('Error in fetchCorrectRound:', err)
          }
        }
        
        fetchCorrectRound();
      }
    }
  }, [gameData, currentRound, gameId, supabase, playerNumber]);
  
  // Timer for countdown
  useEffect(() => {
    if (!currentRound || currentRound.status !== 'active' || timeLeft <= 0) return
    
    const interval = setInterval(() => {
      setTimeLeft(prevTime => {
        const newTime = prevTime - 1
        if (newTime <= 0) {
          clearInterval(interval)
          submitAnswer()
        }
        return newTime > 0 ? newTime : 0
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [currentRound, timeLeft])
  
  const startGame = async () => {
    if (!isHost) return
    
    setLoading(true)
    
    try {
      console.log("Starting game with data:", gameData)
      console.log("Player1_id:", gameData?.player1_id)
      console.log("Player2_id:", gameData?.player2_id)
      
      if (!gameData.player1_id || !gameData.player2_id) {
        toast({
          title: "Cannot start game",
          description: "Need two players to start the game.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }
      
      // First update game status to 'playing'
      const { data: updatedGame, error } = await supabase
        .from('game_rooms')
        .update({ status: 'playing' })
        .eq('id', gameId)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating game status:', error)
        throw new Error(`Failed to update game status: ${error.message}`)
      }
      
      console.log("Game status updated to playing:", updatedGame)
      
      // Create first round
      const response = await fetch('/api/game/create-round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameId, roundNumber: 1 }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        try {
          const errorData = JSON.parse(errorText)
          throw new Error(`Failed to create round: ${errorData.error || response.statusText}`)
        } catch (e) {
          throw new Error(`Failed to create round: ${errorText || response.statusText}`)
        }
      }
      
      const roundResult = await response.json()
      console.log("Round created:", roundResult)
      
      // Force a refresh of the game data to ensure we're in sync
      // Wait for database to be fully consistent
      setTimeout(async () => {
        try {
          // Explicitly fetch updated game room data
          const { data: updatedGameRoom, error: fetchError } = await supabase
            .from('game_rooms')
            .select('*')
            .eq('id', gameId)
            .single()
            
          if (fetchError) {
            console.error('Error fetching updated game:', fetchError)
            throw fetchError
          }
            
          if (updatedGameRoom) {
            console.log("Game started, updated data:", updatedGameRoom)
            setGameData(updatedGameRoom)
            
            // Also fetch the newly created round
            const { data: round, error: roundError } = await supabase
              .from('rounds')
              .select('*')
              .eq('game_room_id', gameId)
              .eq('round_number', 1)
              .single()
              
            if (roundError) {
              console.error('Error fetching round:', roundError)
              throw roundError
            }
              
            if (round) {
              console.log("First round fetched:", round)
              setCurrentRound(round)
              setTimeLeft(round.time_limit)
              setSubmittedAnswer(false)
              setAnswer('')
            } else {
              console.error('Round was not found after creation')
              // Try fetching from the API again if the round wasn't found
              const retryResponse = await fetch('/api/game/create-round', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ gameId, roundNumber: 1 }),
              })
              
              if (retryResponse.ok) {
                console.log("Successfully retried round creation")
                // Force page reload as a last resort if we're still having issues
                window.location.reload()
              }
            }
          }
          
          setLoading(false)
        } catch (refreshError) {
          console.error('Error refreshing game data:', refreshError)
          setLoading(false)
          // Show toast to ask user to refresh
          toast({
            title: "Game started but refresh needed",
            description: "Please refresh the page if you don't see the game.",
            action: (
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            ),
          })
        }
      }, 800)  // Increased delay to ensure database consistency
      
      toast({
        title: "Game started!",
        description: "First round is beginning now.",
      })
    } catch (error) {
      console.error('Error starting game:', error)
      toast({
        title: "Failed to start game",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const submitAnswer = async () => {
    if (!currentRound || !playerNumber) {
      console.log("Cannot submit answer:", { 
        hasCurrentRound: !!currentRound,
        playerNumber,
        submittedAnswer
      })
      return;
    }
    
    // 既に送信済みかチェック
    if (submittedAnswer) {
      console.log("Answer already submitted, ignoring duplicate submission");
      return;
    }
    
    try {
      const field = playerNumber === 1 ? 'player1_answer' : 'player2_answer';
      
      // Set submitted state immediately to improve UI responsiveness
      setSubmittedAnswer(true);
      
      console.log(`Submitting answer for player ${playerNumber}:`, answer);
      
      // Log more details about the round and player IDs for debugging
      console.log("Current round ID:", currentRound.id);
      console.log("Player number:", playerNumber);
      console.log("Player ID:", userId);
      
      const { error } = await supabase
        .from('rounds')
        .update({ [field]: answer || "No answer provided" })
        .eq('id', currentRound.id);
      
      if (error) {
        console.error('Error submitting answer:', error);
        // Revert state if submission failed
        setSubmittedAnswer(false);
        throw error;
      }
      
      toast({
        title: "Answer submitted!",
        description: "Waiting for the other player to submit their answer.",
      });
      
      // Immediately fetch the latest round data to update UI for all users
      try {
        const { data: updatedRound, error: fetchError } = await supabase
          .from('rounds')
          .select('*')
          .eq('id', currentRound.id)
          .single()
          
        if (fetchError) throw fetchError
        
        if (updatedRound) {
          console.log("Round data after my submission:", updatedRound)
          setCurrentRound(updatedRound)
          
          // Check if both players have submitted
          if (updatedRound.player1_answer && updatedRound.player2_answer) {
            console.log("Both players have submitted, triggering evaluation")
            // Update round status if both players submitted
            try {
              // First update round status to evaluating for all users
              await supabase
                .from('rounds')
                .update({ status: 'evaluating' })
                .eq('id', currentRound.id)
                
              // Then trigger evaluation
              const evalResponse = await fetch('/api/game/evaluate-round', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ roundId: currentRound.id }),
              })
              
              if (!evalResponse.ok) {
                console.error('Evaluation API error:', await evalResponse.text())
              }
            } catch (evalError) {
              console.error('Error during evaluation process:', evalError)
            }
          }
        }
      } catch (err) {
        console.error("Error fetching updated round after submission:", err)
      }
    } catch (error) {
      console.error('Error submitting answer:', error)
      toast({
        title: "Failed to submit answer",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }
  
  const nextRound = async () => {
    if (!isHost || !gameData) return
    
    setLoading(true)
    
    try {
      // Reset state in advance (for UI responsiveness) - explicit reset is possible for the next round
      setSubmittedAnswer(false)
      setAnswer('')
      
      // Check if this was the last round
      if (gameData.current_round >= gameData.total_rounds) {
        // Game is over
        await supabase
          .from('game_rooms')
          .update({ status: 'completed' })
          .eq('id', gameId)
        
        toast({
          title: "Game completed!",
          description: "Thanks for playing!",
        })
        return
      }
      
      // Create next round
      const nextRoundNumber = gameData.current_round + 1
      
      // Log the round transition
      console.log(`Moving from round ${gameData.current_round} to round ${nextRoundNumber}`)
      
      // Update game's current round
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ current_round: nextRoundNumber })
        .eq('id', gameId)
        
      if (updateError) {
        throw new Error(`Failed to update game round: ${updateError.message}`)
      }
      
      // Create the new round
      const response = await fetch('/api/game/create-round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameId, roundNumber: nextRoundNumber }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create next round: ${errorText}`)
      }
      
      // Get the response data
      const roundResult = await response.json()
      console.log("Next round created:", roundResult)
      
      // Immediately update our local state
      const { data: updatedGameRoom } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', gameId)
        .single()
        
      if (updatedGameRoom) {
        setGameData(updatedGameRoom)
      }
      
      toast({
        title: `Round ${nextRoundNumber} starting!`,
        description: "Get ready for the next challenge.",
      })
      
      // Fetch the new round after a short delay to ensure all subscriptions have received updates
      setTimeout(async () => {
        try {
          // Reset state (for the new round)
          setSubmittedAnswer(false)
          setAnswer('')
          
          const { data: newRound } = await supabase
            .from('rounds')
            .select('*')
            .eq('game_room_id', gameId)
            .eq('round_number', nextRoundNumber)
            .single()
            
          if (newRound) {
            console.log("New round fetched:", newRound)
            setCurrentRound(newRound)
            setTimeLeft(newRound.time_limit)
            setLoading(false)
          } else {
            // If round not found, manually fetch all necessary data instead of using fetchGameData
            try {
              console.log("Round not found, manually refreshing all data...")
              // Get game data
              const { data: refreshedGame } = await supabase
                .from('game_rooms')
                .select('*')
                .eq('id', gameId)
                .single()
                
              if (refreshedGame) {
                setGameData(refreshedGame)
                // Get latest round
                const { data: latestRound } = await supabase
                  .from('rounds')
                  .select('*')
                  .eq('game_room_id', gameId)
                  .eq('round_number', refreshedGame.current_round)
                  .single()
                  
                if (latestRound) {
                  setCurrentRound(latestRound)
                  setTimeLeft(latestRound.time_limit)
                }
              }
              setLoading(false)
            } catch (refreshError) {
              console.error("Error manually refreshing data:", refreshError)
              setLoading(false)
            }
          }
        } catch (err) {
          console.error("Error fetching new round:", err)
          // Manually refresh all data instead of using fetchGameData
          try {
            console.log("Error occurred, manually refreshing all data...")
            // Get game data
            const { data: refreshedGame } = await supabase
              .from('game_rooms')
              .select('*')
              .eq('id', gameId)
              .single()
              
            if (refreshedGame) {
              setGameData(refreshedGame)
              // Get latest round
              const { data: latestRound } = await supabase
                .from('rounds')
                .select('*')
                .eq('game_room_id', gameId)
                .eq('round_number', refreshedGame.current_round)
                .single()
                
              if (latestRound) {
                setCurrentRound(latestRound)
                setTimeLeft(latestRound.time_limit)
              }
            }
            setLoading(false)
          } catch (refreshError) {
            console.error("Error manually refreshing data:", refreshError)
            setLoading(false)
          }
        }
      }, 700) // さらに待機時間を延長
    } catch (error) {
      console.error('Error starting next round:', error)
      toast({
        title: "Failed to start next round",
        description: "Please try again.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }
  
  if (loading && !gameData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading game...</p>
        </div>
      </div>
    )
  }
  
  // Waiting for opponent
  if (gameData?.status === 'waiting') {
    const player1 = gameData.player1_id ? players[gameData.player1_id] : null
    const player2 = gameData.player2_id ? players[gameData.player2_id] : null
    
    console.log("Waiting room state - player1:", player1?.username)
    console.log("Waiting room state - player2:", player2?.username)
    console.log("Is host:", isHost)
    console.log("Can start game:", isHost && !!gameData.player1_id && !!gameData.player2_id)
    
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Waiting Room</CardTitle>
            <CardDescription>
              {gameData.player1_id && gameData.player2_id
                ? "Both players have joined! Ready to start the game."
                : `Share code ${gameData.code} with another player to join.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
                <Avatar className="h-14 w-14 mb-2">
                  <AvatarFallback>{player1?.username?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <p className="font-medium">{player1?.username || 'Waiting...'}</p>
                <p className="text-xs text-muted-foreground">
                  Player 1
                  {playerNumber === 1 && <span className="ml-1">(You)</span>}
                </p>
              </div>
              
              <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
                {player2 ? (
                  <>
                    <Avatar className="h-14 w-14 mb-2">
                      <AvatarFallback>{player2.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <p className="font-medium">{player2.username}</p>
                    <p className="text-xs text-muted-foreground">
                      Player 2
                      {playerNumber === 2 && <span className="ml-1">(You)</span>}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="h-14 w-14 mb-2 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                    <p className="font-medium">Waiting for player...</p>
                    <p className="text-xs text-muted-foreground">Player 2</p>
                  </>
                )}
              </div>
            </div>
            
            <div className="bg-card p-3 rounded-md border">
              <p className="text-sm font-medium mb-1">Game Settings</p>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span>Rounds</span>
                  <span>{gameData.total_rounds}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Game Code</span>
                  <span className="font-mono">{gameData.code}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Player ID</span>
                  <span className="font-mono text-xs truncate max-w-[140px]">{userId}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button 
              className="w-full" 
              onClick={startGame} 
              disabled={!isHost || !gameData.player1_id || !gameData.player2_id || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                isHost ? "Start Game" : "Waiting for host to start..."
              )}
            </Button>
            
            {!player2 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin + `/join-game/${gameData.code}?new=true`);
                  toast({
                    title: "URL copied!",
                    description: "Share this URL with your opponent",
                  });
                }}
              >
                Copy Join URL
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  // Game completed
  if (gameData?.status === 'completed') {
    const player1 = gameData.player1_id ? players[gameData.player1_id] : null
    const player2 = gameData.player2_id ? players[gameData.player2_id] : null
    
    const winner = gameData.player1_score > gameData.player2_score
      ? player1
      : gameData.player2_score > gameData.player1_score
      ? player2
      : null
    
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex justify-center items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Game Complete!
            </CardTitle>
            <CardDescription>
              {winner
                ? `${winner.username} wins the game!`
                : "It's a tie!"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className={`flex flex-col items-center p-4 rounded-lg border-2 ${gameData.player1_score > gameData.player2_score ? 'border-yellow-500 bg-yellow-500/10' : 'border-muted'}`}>
                <Avatar className="h-16 w-16 mb-2">
                  <AvatarFallback>{player1?.username?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <p className="font-medium">{player1?.username}</p>
                <div className="mt-2 text-2xl font-bold">{gameData.player1_score}</div>
                <p className="text-xs text-muted-foreground">points</p>
              </div>
              
              <div className={`flex flex-col items-center p-4 rounded-lg border-2 ${gameData.player2_score > gameData.player1_score ? 'border-yellow-500 bg-yellow-500/10' : 'border-muted'}`}>
                <Avatar className="h-16 w-16 mb-2">
                  <AvatarFallback>{player2?.username?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <p className="font-medium">{player2?.username}</p>
                <div className="mt-2 text-2xl font-bold">{gameData.player2_score}</div>
                <p className="text-xs text-muted-foreground">points</p>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">Thank you for playing!</p>
              <p className="text-sm">Want to play again with the same players?</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button 
              className="w-full" 
              onClick={() => router.push('/')}
            >
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  // Active game with current round
  if (gameData?.status === 'playing' && currentRound) {
    const player1 = gameData.player1_id ? players[gameData.player1_id] : null
    const player2 = gameData.player2_id ? players[gameData.player2_id] : null
    
    const roundStatus = currentRound.status
    const isActive = roundStatus === 'active'
    const isEvaluating = roundStatus === 'evaluating'
    const isCompleted = roundStatus === 'completed'
    
    // Always use the current round data from the database to determine submission status
    // This ensures we're showing the most up-to-date state
    const player1Submitted = !!currentRound.player1_answer
    const player2Submitted = !!currentRound.player2_answer
    
    // For the current player, also consider the local submission state for immediate feedback
    const currentPlayerSubmitted = playerNumber === 1 ? player1Submitted || submittedAnswer : 
                                  playerNumber === 2 ? player2Submitted || submittedAnswer : false
    
    const evaluationResult = currentRound.evaluation_result 
      ? JSON.parse(typeof currentRound.evaluation_result === 'string' 
          ? currentRound.evaluation_result 
          : JSON.stringify(currentRound.evaluation_result))
      : null
    
    const winnerName = currentRound.winner_id 
      ? (currentRound.winner_id === gameData.player1_id 
          ? player1?.username 
          : player2?.username)
      : null
    
    const canSubmit = isActive && !currentPlayerSubmitted
    
    return (
      <div className="flex min-h-screen flex-col p-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <p className="font-medium">Round {gameData.current_round} of {gameData.total_rounds}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm">
              <div className="h-2 w-2 rounded-full bg-chart-1"></div>
              <span>{player1?.username}: {gameData.player1_score}</span>
            </div>
            <span className="text-muted-foreground">vs</span>
            <div className="flex items-center gap-1 text-sm">
              <div className="h-2 w-2 rounded-full bg-chart-2"></div>
              <span>{player2?.username}: {gameData.player2_score}</span>
            </div>
          </div>
        </div>
        
        {isActive && (
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Circle className={`h-3 w-3 ${player1Submitted ? 'fill-green-500 text-green-500' : 'fill-muted text-muted'}`} />
                <span className="text-xs">{player1?.username}</span>
              </div>
              <div className="flex items-center gap-1">
                <Circle className={`h-3 w-3 ${player2Submitted ? 'fill-green-500 text-green-500' : 'fill-muted text-muted'}`} />
                <span className="text-xs">{player2?.username}</span>
              </div>
            </div>
          </div>
        )}
        
        {isEvaluating && (
          <div className="mb-6 p-3 bg-muted rounded-md flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span>Evaluating answers...</span>
          </div>
        )}
        
        {isCompleted && winnerName && (
          <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500 rounded-md flex items-center justify-center">
            <Trophy className="h-4 w-4 text-yellow-500 mr-2" />
            <span><strong>{winnerName}</strong> won this round!</span>
          </div>
        )}
        
        {isCompleted && !winnerName && (
          <div className="mb-6 p-3 bg-muted rounded-md flex items-center justify-center">
            <span>This round ended in a tie!</span>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="col-span-1 md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Program</CardTitle>
              <CardDescription>
                What does this program do? Study the code below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeDisplay 
                code={currentRound.program_code} 
                height="200px"
                title="Program Code"
                path={currentRound.path} 
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Your Answer</CardTitle>
              <CardDescription>
                Explain what you think this program does.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Enter your explanation here..."
                className="min-h-[120px]"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={!canSubmit}
              />
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={submitAnswer}
                disabled={!canSubmit || !answer}
              >
                Submit Answer
              </Button>
            </CardFooter>
          </Card>
          
          {isCompleted ? (
            <Card>
              <CardHeader className="pb-2">
                <Tabs defaultValue="answers">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="answers">Answers</TabsTrigger>
                    <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
                  </TabsList>
                  <TabsContent value="answers" className="space-y-4 mt-2">
                    <div>
                      <h4 className="text-sm font-medium mb-1">{player1?.username}'s answer:</h4>
                      <p className="text-sm p-3 bg-muted rounded-md">
                        {currentRound.player1_answer || "No answer provided"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">{player2?.username}'s answer:</h4>
                      <p className="text-sm p-3 bg-muted rounded-md">
                        {currentRound.player2_answer || "No answer provided"}
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="evaluation" className="mt-2">
                    <div className="space-y-3">
                      {playerNumber && (
                        <div className="p-3 rounded-md text-center font-medium mb-3" 
                          style={{
                            backgroundColor: currentRound.winner_id 
                              ? (currentRound.winner_id === (playerNumber === 1 ? gameData.player1_id : gameData.player2_id) 
                                ? 'rgba(132, 204, 22, 0.1)' 
                                : 'rgba(239, 68, 68, 0.1)')
                              : 'rgba(100, 116, 139, 0.1)',
                            color: currentRound.winner_id 
                              ? (currentRound.winner_id === (playerNumber === 1 ? gameData.player1_id : gameData.player2_id) 
                                ? 'rgb(132, 204, 22)' 
                                : 'rgb(239, 68, 68)')
                              : 'rgb(100, 116, 139)',
                            border: currentRound.winner_id 
                              ? (currentRound.winner_id === (playerNumber === 1 ? gameData.player1_id : gameData.player2_id) 
                                ? '1px solid rgb(132, 204, 22)' 
                                : '1px solid rgb(239, 68, 68)')
                              : '1px solid rgb(100, 116, 139)'
                          }}>
                          {currentRound.winner_id 
                            ? (currentRound.winner_id === (playerNumber === 1 ? gameData.player1_id : gameData.player2_id) 
                              ? 'You won this round! 🎉' 
                              : 'You lost this round')
                            : "This round ended in a tie"}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-medium mb-1">Actual Description:</h4>
                        <p className="text-sm p-3 bg-muted rounded-md">
                          {currentRound.program_description}
                        </p>
                      </div>
                      {evaluationResult && (
                        <>
                          <div>
                            <h4 className="text-sm font-medium mb-1">AI Evaluation:</h4>
                            <p className="text-sm p-3 bg-muted rounded-md">
                              {evaluationResult.explanation}
                            </p>
                          </div>
                          <div className="pt-2">
                            <div className="flex justify-between text-sm">
                              <span>{player1?.username} {playerNumber === 1 && "(You)"}</span>
                              <span>{evaluationResult.player1Score}/10</span>
                            </div>
                            <Progress value={evaluationResult.player1Score * 10} className="h-2 mt-1" />
                            
                            <div className="flex justify-between text-sm mt-3">
                              <span>{player2?.username} {playerNumber === 2 && "(You)"}</span>
                              <span>{evaluationResult.player2Score}/10</span>
                            </div>
                            <Progress value={evaluationResult.player2Score * 10} className="h-2 mt-1" />
                          </div>
                        </>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs"
                    asChild
                  >
                    <a href={currentRound.program_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                      <Github className="h-3 w-3" />
                      View on GitHub
                    </a>
                  </Button>
                  
                  {isHost && (
                    <Button
                      onClick={nextRound}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : gameData.current_round >= gameData.total_rounds ? (
                        "End Game"
                      ) : (
                        "Next Round"
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Status</CardTitle>
                <CardDescription>
                  {isActive 
                    ? submittedAnswer 
                      ? "Waiting for the other player to submit their answer."
                      : "Enter your answer before the timer runs out."
                    : "Evaluating answers..."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-md">
                    <h4 className="text-sm font-medium mb-2">Players</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>{player1?.username.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {player1?.username} 
                            {playerNumber === 1 && <span className="text-xs ml-1 text-muted-foreground">(You)</span>}
                          </span>
                        </div>
                        <div className="text-xs font-medium px-2 py-1 rounded-full bg-background">
                          {player1Submitted ? "Submitted" : "Typing..."}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>{player2?.username.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {player2?.username}
                            {playerNumber === 2 && <span className="text-xs ml-1 text-muted-foreground">(You)</span>}
                          </span>
                        </div>
                        <div className="text-xs font-medium px-2 py-1 rounded-full bg-background">
                          {player2Submitted ? "Submitted" : "Typing..."}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    {isActive ? (
                      submittedAnswer ? (
                        <p>Your answer has been submitted. Waiting for evaluation...</p>
                      ) : (
                        <p>Analyze the code and provide your best explanation!</p>
                      )
                    ) : (
                      <p>Both answers have been submitted. Evaluating results...</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Loading game state...</p>
      </div>
    </div>
  )
}