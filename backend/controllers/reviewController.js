const { supabase } = require('../supabase');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Daily Review System - Spaced Repetition
 * Scans user's chat history and generates a tile asking them to recall something learned previously
 */
exports.getDailyReview = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's last review to implement spaced repetition
    const { data: lastReview, error: reviewError } = await supabase
      .from('user_reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Check if user already reviewed today
    if (lastReview && isToday(new Date(lastReview.created_at))) {
      return res.json({
        success: true,
        hasReview: false,
        message: 'You\'ve already completed your daily review!'
      });
    }

    // Fetch user's recent chat messages to find concepts to review
    const daysAgo = lastReview ? getDaysAgo(new Date(lastReview.created_at)) : 7;
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() - Math.min(daysAgo, 7)); // Review from 3-7 days ago

    // Get user's chat sessions first
    const { data: sessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', userId);

    if (sessionsError) throw sessionsError;

    if (!sessions || sessions.length === 0) {
      return res.json({
        success: true,
        hasReview: false,
        message: 'No chat history found. Start chatting to enable reviews!'
      });
    }

    const sessionIds = sessions.map(s => s.id);

    // Get messages from those sessions
    const { data: chatMessages, error: chatError } = await supabase
      .from('chat_messages')
      .select('*')
      .in('session_id', sessionIds)
      .gte('created_at', reviewDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (chatError) throw chatError;

    if (!chatMessages || chatMessages.length === 0) {
      return res.json({
        success: true,
        hasReview: false,
        message: 'Not enough chat history for review yet. Keep learning!'
      });
    }

    // Extract learning content from chat history
    const learningContent = chatMessages
      .filter(msg => msg.sender === 'bot') // Bot responses contain teaching content
      .map(msg => msg.content)
      .join('\n\n')
      .slice(0, 5000); // Limit context size

    if (!learningContent || learningContent.length < 100) {
      return res.json({
        success: true,
        hasReview: false,
        message: 'Not enough learning content for review yet. Chat more with your tutor!'
      });
    }

    // Use AI to generate a review question
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `You are creating a spaced repetition review question.

Based on this user's recent learning history, create ONE thought-provoking review question:

${learningContent}

Generate a JSON response with:
{
  "question": "A clear, specific question about a key concept they learned",
  "hint": "A helpful hint to jog their memory",
  "topic": "The main topic being reviewed",
  "emoji": "An appropriate emoji for the topic"
}

Make it engaging and test their understanding, not just recall.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse AI response
    let reviewData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      reviewData = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      reviewData = {
        question: "What's one key concept you learned recently?",
        hint: "Think about your recent conversations",
        topic: "General Review",
        emoji: "🧠"
      };
    }

    // Store the review for tracking
    const { data: newReview, error: insertError } = await supabase
      .from('user_reviews')
      .insert({
        user_id: userId,
        question: reviewData.question,
        hint: reviewData.hint,
        topic: reviewData.topic,
        emoji: reviewData.emoji,
        completed: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.json({
      success: true,
      hasReview: true,
      review: {
        id: newReview.id,
        question: reviewData.question,
        hint: reviewData.hint,
        topic: reviewData.topic,
        emoji: reviewData.emoji
      }
    });

  } catch (error) {
    console.error('Error generating daily review:', error);
    res.status(500).json({ 
      error: 'Failed to generate review', 
      details: error.message 
    });
  }
};

/**
 * Submit a review answer
 */
exports.submitReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId, answer } = req.body;

    if (!reviewId || !answer) {
      return res.status(400).json({ error: 'Review ID and answer are required' });
    }

    // Get the review
    const { data: review, error: reviewError } = await supabase
      .from('user_reviews')
      .select('*')
      .eq('id', reviewId)
      .eq('user_id', userId)
      .single();

    if (reviewError || !review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.completed) {
      return res.status(400).json({ error: 'Review already completed' });
    }

    // Use AI to evaluate the answer
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `Evaluate this review answer:

Question: ${review.question}
User's Answer: ${answer}

Provide a JSON response with:
{
  "isCorrect": true/false,
  "feedback": "Constructive feedback on their answer",
  "score": 0-100 (quality of understanding),
  "keyPoints": ["key point 1", "key point 2"]
}

Be encouraging but honest.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let evaluation;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      evaluation = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (parseError) {
      console.error('Failed to parse evaluation:', responseText);
      evaluation = {
        isCorrect: true,
        feedback: "Great effort! Keep reviewing to strengthen your understanding.",
        score: 70,
        keyPoints: ["Continue practicing", "Review the material"]
      };
    }

    // Update the review
    const { data: updatedReview, error: updateError } = await supabase
      .from('user_reviews')
      .update({
        completed: true,
        user_answer: answer,
        evaluation: evaluation,
        completed_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Award XP for completing review
    const xpEarned = Math.round(evaluation.score / 2); // 0-50 XP based on quality
    
    await supabase.rpc('increment_user_xp', {
      user_id_param: userId,
      xp_amount: xpEarned
    }).catch(err => console.error('Failed to award XP:', err));

    res.json({
      success: true,
      evaluation,
      xpEarned,
      message: evaluation.isCorrect ? 'Excellent recall! 🎉' : 'Good try! Keep reviewing.'
    });

  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ 
      error: 'Failed to submit review', 
      details: error.message 
    });
  }
};

/**
 * Get user's review history
 */
exports.getReviewHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 30, offset = 0 } = req.query;

    const { data: reviews, error } = await supabase
      .from('user_reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Calculate statistics
    const totalReviews = reviews.length;
    const completedReviews = reviews.filter(r => r.completed).length;
    const averageScore = completedReviews > 0
      ? reviews
          .filter(r => r.completed && r.evaluation?.score)
          .reduce((sum, r) => sum + r.evaluation.score, 0) / completedReviews
      : 0;

    res.json({
      success: true,
      reviews,
      statistics: {
        totalReviews,
        completedReviews,
        completionRate: totalReviews > 0 ? (completedReviews / totalReviews * 100).toFixed(1) : 0,
        averageScore: averageScore.toFixed(1)
      }
    });

  } catch (error) {
    console.error('Error fetching review history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch review history', 
      details: error.message 
    });
  }
};

/**
 * Get review statistics for analytics
 */
exports.getReviewStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get reviews from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentReviews, error } = await supabase
      .from('user_reviews')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;

    const completedReviews = recentReviews.filter(r => r.completed);
    const currentStreak = calculateStreak(recentReviews);

    const stats = {
      totalReviews: recentReviews.length,
      completedReviews: completedReviews.length,
      currentStreak,
      averageScore: completedReviews.length > 0
        ? completedReviews.reduce((sum, r) => sum + (r.evaluation?.score || 0), 0) / completedReviews.length
        : 0,
      topicsReviewed: [...new Set(completedReviews.map(r => r.topic))],
      lastReviewDate: recentReviews.length > 0 ? recentReviews[0].created_at : null
    };

    res.json({ success: true, stats });

  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch review stats', 
      details: error.message 
    });
  }
};

// Helper functions
function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

function getDaysAgo(date) {
  const today = new Date();
  const diffTime = Math.abs(today - date);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculateStreak(reviews) {
  if (reviews.length === 0) return 0;

  const sortedReviews = reviews
    .filter(r => r.completed)
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

  let streak = 0;
  let currentDate = new Date();

  for (const review of sortedReviews) {
    const reviewDate = new Date(review.completed_at);
    const daysDiff = getDaysAgo(reviewDate);

    if (daysDiff === streak) {
      streak++;
    } else if (daysDiff > streak + 1) {
      break;
    }
  }

  return streak;
}
