"use client"

import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Command as CommandLineIcon, BrainCircuit, UsersIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useState } from 'react'

export default function Home() {
  const router = useRouter()
  const [rounds, setRounds] = useState<number>(3)
  const [gameCode, setGameCode] = useState<string>('')

  const handleCreateGame = () => {
    router.push(`/create-game?rounds=${rounds}`)
  }

  const handleJoinGame = () => {
    if (gameCode.length === 5) {
      router.push(`/join-game/${gameCode}?new=true`)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BrainCircuit className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">AI Program Guessing Game</h1>
          <p className="text-muted-foreground">Test your programming knowledge in this real-time multiplayer challenge</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CommandLineIcon className="h-5 w-5" />
                Create New Game
              </CardTitle>
              <CardDescription>
                Host a new game and invite a friend
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rounds">Number of Rounds</Label>
                  <RadioGroup id="rounds" defaultValue="3" className="flex gap-4" onValueChange={(val) => setRounds(parseInt(val))}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="3" id="r3" />
                      <Label htmlFor="r3">3</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="5" id="r5" />
                      <Label htmlFor="r5">5</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="7" id="r7" />
                      <Label htmlFor="r7">7</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleCreateGame} className="w-full">Create Game</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                Join Game
              </CardTitle>
              <CardDescription>
                Join an existing game with a code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="game-code">Game Code</Label>
                  <Input 
                    id="game-code" 
                    placeholder="Enter 5-digit code" 
                    maxLength={5}
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.toUpperCase())} 
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleJoinGame} 
                className="w-full"
                disabled={gameCode.length !== 5}
              >
                Join Game
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="p-4 bg-card rounded-lg border">
          <h2 className="font-semibold mb-2">How to Play</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Each round, both players are shown the same code snippet from a real GitHub repository</li>
            <li>Write what you think the program does within the time limit</li>
            <li>AI will evaluate both answers and determine which is closer to the actual functionality</li>
            <li>The player with the most accurate description wins the round</li>
            <li>Win the majority of rounds to win the game!</li>
          </ol>
          
          <h2 className="font-semibold mb-2 mt-4">Testing Tips</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>For the best experience, use different browsers or devices for each player</li>
            <li>If testing alone, you can use the same browser - the game will generate unique IDs for each player</li>
            <li>When joining as the second player, a new user ID is automatically generated</li>
          </ul>
        </div>
      </div>
    </div>
  )
}