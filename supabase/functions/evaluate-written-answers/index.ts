import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WrittenAnswer {
  answer_a: string;
  answer_b: string;
}

interface EvaluationResult {
  score: number;
  feedback_uz: string;
  feedback_ru: string;
  strengths: string[];
  missing_points: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attempt_id } = await req.json();
    
    if (!attempt_id) {
      return new Response(
        JSON.stringify({ error: "attempt_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Get attempt data
    const { data: attempt, error: attemptError } = await supabase
      .from('test_attempts')
      .select('*, tests(*)')
      .eq('id', attempt_id)
      .single();
    
    if (attemptError || !attempt) {
      return new Response(
        JSON.stringify({ error: "Attempt not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate: attempt must be finished
    if (attempt.status !== 'finished') {
      return new Response(
        JSON.stringify({ error: "Attempt is not finished" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent re-evaluation
    if (attempt.evaluation_status === 'completed') {
      return new Response(
        JSON.stringify({ error: "Attempt already evaluated" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Update status to evaluating
    await supabase
      .from('test_attempts')
      .update({ evaluation_status: 'evaluating' })
      .eq('id', attempt_id);
    
    // Get ALL questions for the test (using service role bypasses RLS)
    const { data: allQuestions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', attempt.test_id)
      .order('order_index');
    
    if (questionsError || !allQuestions) {
      await supabase
        .from('test_attempts')
        .update({ evaluation_status: 'completed' })
        .eq('id', attempt_id);
      return new Response(
        JSON.stringify({ message: "No questions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mcqQuestions = allQuestions.filter((q: any) => q.question_type === 'single_choice');
    const writtenQuestions = allQuestions.filter((q: any) => q.question_type === 'written');
    const answers = attempt.answers || {};
    const writtenAnswers = attempt.written_answers || {};

    // --- Compute MCQ scores server-side ---
    let mcqCorrect = 0;
    const allEvaluations: Record<string, any> = {};

    for (const q of mcqQuestions) {
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer === q.correct_option;
      if (isCorrect) mcqCorrect++;
      allEvaluations[q.id] = {
        correct_option: q.correct_option,
        user_answer: userAnswer,
        is_correct: isCorrect
      };
    }

    // --- Evaluate written questions with AI ---
    let totalWrittenScore = 0;

    if (writtenQuestions.length === 0) {
      // No written questions - just save MCQ results
      await supabase
        .from('test_attempts')
        .update({
          ai_evaluation: allEvaluations,
          mcq_score: mcqCorrect,
          correct_answers: mcqCorrect,
          written_score: 0,
          evaluation_status: 'completed',
          score: mcqCorrect
        })
        .eq('id', attempt_id);

      return new Response(
        JSON.stringify({ success: true, mcq_score: mcqCorrect, total_score: mcqCorrect }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Evaluate each written question
    for (const question of writtenQuestions) {
      const answer = writtenAnswers[question.id] as WrittenAnswer | undefined;
      
      if (!answer || (!answer.answer_a?.trim() && !answer.answer_b?.trim())) {
        allEvaluations[question.id] = {
          score: 0,
          feedback_uz: "Javob berilmagan",
          feedback_ru: "Ответ не предоставлен",
          strengths: [],
          missing_points: ["Javob yozilmagan / Ответ не написан"]
        };
        continue;
      }
      
      const systemPrompt = `You are an expert exam evaluator for the Uzbekistan National Certificate (Milliy Sertifikat) exam.

EVALUATION METHOD: RUSH (Rubric-based, Understanding-focused, Structured feedback, Human-like judgment)

CRITICAL RULES:
1. MEANING over exact wording - evaluate understanding, not memorization
2. PARTIAL CREDIT - give partial points for partially correct answers
3. SPELLING/GRAMMAR - minor errors should NOT heavily reduce score
4. STRUCTURED FEEDBACK - provide clear strengths and missing points

SCORING SCALE (0-2 points):
- 0 points: No answer, completely wrong, or irrelevant
- 0.5 points: Shows some understanding but mostly incorrect or incomplete
- 1 point: Partially correct, demonstrates basic understanding
- 1.5 points: Mostly correct with minor gaps
- 2 points: Fully correct, demonstrates complete understanding

You MUST respond with a JSON object in this exact format:
{
  "score": <number between 0 and 2>,
  "feedback_uz": "<feedback in Uzbek>",
  "feedback_ru": "<feedback in Russian>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "missing_points": ["<missing point 1>"]
}`;

      const userPrompt = `QUESTION (Savol):
${question.question_text_uz}
${question.question_text_ru ? `\n(Russian): ${question.question_text_ru}` : ''}

MODEL ANSWER (Namunaviy javob):
${question.model_answer_uz || 'Not provided'}
${question.model_answer_ru ? `\n(Russian): ${question.model_answer_ru}` : ''}

EVALUATION RUBRIC:
${question.rubric_uz || 'Evaluate based on correctness and completeness'}
${question.rubric_ru ? `\n(Russian): ${question.rubric_ru}` : ''}

STUDENT'S ANSWER (O'quvchining javobi):
Answer A: ${answer.answer_a || '(empty)'}
Answer B: ${answer.answer_b || '(empty)'}

Evaluate this answer according to RUSH methodology and respond with JSON only.`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.3
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error("AI gateway error:", aiResponse.status, errorText);
          
          if (aiResponse.status === 429) {
            return new Response(
              JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (aiResponse.status === 402) {
            return new Response(
              JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw new Error(`AI gateway error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        
        if (!content) {
          throw new Error("Empty AI response");
        }
        
        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }
        
        const evaluation: EvaluationResult = JSON.parse(jsonStr);
        evaluation.score = Math.max(0, Math.min(question.max_points || 2, evaluation.score));
        
        allEvaluations[question.id] = evaluation;
        totalWrittenScore += evaluation.score;
        
      } catch (evalError) {
        console.error(`Error evaluating question ${question.id}:`, evalError);
        allEvaluations[question.id] = {
          score: 0,
          feedback_uz: "Baholashda xatolik yuz berdi",
          feedback_ru: "Произошла ошибка при оценке",
          strengths: [],
          missing_points: ["Texnik xatolik / Техническая ошибка"]
        };
      }
    }
    
    // Update attempt with all evaluation results
    const totalScore = mcqCorrect + totalWrittenScore;
    const { error: updateError } = await supabase
      .from('test_attempts')
      .update({
        ai_evaluation: allEvaluations,
        mcq_score: mcqCorrect,
        correct_answers: mcqCorrect,
        written_score: totalWrittenScore,
        evaluation_status: 'completed',
        score: totalScore
      })
      .eq('id', attempt_id);
    
    if (updateError) {
      console.error("Error updating attempt:", updateError);
      throw updateError;
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        mcq_score: mcqCorrect,
        written_score: totalWrittenScore,
        total_score: totalScore
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Evaluation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
