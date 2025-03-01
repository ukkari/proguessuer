import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { roundId } = await request.json();
    
    // Get round details
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('*')
      .eq('id', roundId)
      .single();
    
    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }
    
    // Update round status to evaluating
    await supabase
      .from('rounds')
      .update({ status: 'evaluating' })
      .eq('id', roundId);
    
    // Get game room to know the players
    const { data: gameRoom, error: gameError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', round.game_room_id)
      .single();
    
    if (gameError || !gameRoom) {
      return NextResponse.json({ error: 'Game room not found' }, { status: 404 });
    }
    
    // Get player details
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', [gameRoom.player1_id, gameRoom.player2_id].filter(Boolean));
    
    if (profilesError) {
      return NextResponse.json({ error: 'Failed to get player profiles' }, { status: 500 });
    }
    
    const player1 = profiles?.find(p => p.id === gameRoom.player1_id);
    const player2 = profiles?.find(p => p.id === gameRoom.player2_id);
    
    // Evaluate the answers using OpenAI
    const evaluationPrompt = `
You are evaluating answers in a programming game where players need to guess what a given program does.

The actual program description is:
"""
${round.program_description}
"""

Player 1 (${player1?.username || 'Player 1'}) guessed:
"""
${round.player1_answer || 'No answer provided'}
"""

Player 2 (${player2?.username || 'Player 2'}) guessed:
"""
${round.player2_answer || 'No answer provided'}
"""

Evaluate both answers against the actual description and determine which player's answer is closer to the actual functionality. Score each answer from 0-10 where 10 is a perfect match.

Your response MUST be a valid JSON object with EXACTLY these fields:
{
  "player1Score": <number between 0-10>,
  "player2Score": <number between 0-10>,
  "winner": "player1" | "player2" | "tie",
  "explanation": "<your detailed reasoning for the scores and winner determination>"
}

For the winner field, use "player1" if Player 1's answer is better, "player2" if Player 2's answer is better, or "tie" if they are equally good or bad.

IMPORTANT: Your entire response must be ONLY the JSON object, with no additional text before or after.
`;

    const evaluation = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        { role: 'system', content: 'You are an expert programming evaluator who provides structured evaluation results in valid JSON format. You must respond with ONLY a valid JSON object, no additional text.' },
        { role: 'user', content: evaluationPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });
    
    // Parse the evaluation result with improved error handling
    let evaluationResult;
    try {
      evaluationResult = JSON.parse(evaluation.choices[0].message.content || '{}');
      
      // Ensure scores are numbers and within range
      if (typeof evaluationResult.player1Score !== 'number') {
        evaluationResult.player1Score = parseFloat(evaluationResult.player1Score) || 0;
      }
      if (typeof evaluationResult.player2Score !== 'number') {
        evaluationResult.player2Score = parseFloat(evaluationResult.player2Score) || 0;
      }
      
      // Ensure scores are within 0-10 range
      evaluationResult.player1Score = Math.min(10, Math.max(0, evaluationResult.player1Score));
      evaluationResult.player2Score = Math.min(10, Math.max(0, evaluationResult.player2Score));
      
      // Validate winner field
      if (!['player1', 'player2', 'tie'].includes(evaluationResult.winner)) {
        // Determine winner based on scores if invalid
        if (evaluationResult.player1Score > evaluationResult.player2Score) {
          evaluationResult.winner = 'player1';
        } else if (evaluationResult.player2Score > evaluationResult.player1Score) {
          evaluationResult.winner = 'player2';
        } else {
          evaluationResult.winner = 'tie';
        }
      }
    } catch (error) {
      console.error('Failed to parse evaluation response as JSON:', error);
      // Fallback to default values
      evaluationResult = {
        player1Score: 5,
        player2Score: 5,
        winner: 'tie',
        explanation: 'There was an error evaluating the answers. Both players receive an equal score.'
      };
    }
    
    // Determine the winner
    let winnerId = null;
    if (evaluationResult.winner === 'player1') {
      winnerId = gameRoom.player1_id;
    } else if (evaluationResult.winner === 'player2') {
      winnerId = gameRoom.player2_id;
    }
    
    // Update the round with the evaluation result and winner
    await supabase
      .from('rounds')
      .update({
        evaluation_result: evaluationResult,
        winner_id: winnerId,
        status: 'completed'
      })
      .eq('id', roundId);
    
    // If there's a winner, update the game score
    if (winnerId) {
      const scoreField = winnerId === gameRoom.player1_id ? 'player1_score' : 'player2_score';
      
      await supabase
        .from('game_rooms')
        .update({
          [scoreField]: gameRoom[scoreField] + 1
        })
        .eq('id', round.game_room_id);
    }
    
    return NextResponse.json({ success: true, evaluationResult });
    
  } catch (error) {
    console.error('Error evaluating round:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}