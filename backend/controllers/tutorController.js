const { supabase } = require('../supabase');

/**
 * Upgrade a user to Tutor role
 */
exports.upgradeTutor = async (req, res) => {
  try {
    const userId = req.user.id;
    const { expertise, teachingStyle, bio, aiPersona } = req.body;

    // Validation
    if (!expertise || !Array.isArray(expertise) || expertise.length === 0) {
      return res.status(400).json({ error: 'Expertise areas are required' });
    }

    if (!teachingStyle) {
      return res.status(400).json({ error: 'Teaching style is required' });
    }

    // Update user role to 'tutor' in profiles table
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .update({ role: 'tutor' })
      .eq('id', userId)
      .select()
      .single();

    if (userError) throw userError;

    // Create or update tutor profile
    const tutorProfile = {
      user_id: userId,
      expertise,
      teaching_style: teachingStyle,
      bio: bio || '',
      ai_persona: aiPersona || {
        tone: 'friendly',
        style: 'conversational',
        formality: 'casual'
      },
      total_students: 0,
      total_paths: 0,
      is_active: true,
      created_at: new Date().toISOString()
    };

    const { data: profileData, error: profileError } = await supabase
      .from('tutor_profiles')
      .upsert(tutorProfile, { onConflict: 'user_id' })
      .select()
      .single();

    if (profileError) throw profileError;

    res.json({
      success: true,
      message: 'Successfully upgraded to Tutor',
      user: userData,
      tutorProfile: profileData
    });
  } catch (error) {
    console.error('Error upgrading to tutor:', error);
    res.status(500).json({ error: 'Failed to upgrade to tutor', details: error.message });
  }
};

/**
 * Get current user's tutor profile
 */
exports.getTutorProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('tutor_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Tutor profile not found' });
      }
      throw error;
    }

    res.json({ success: true, tutorProfile: data });
  } catch (error) {
    console.error('Error fetching tutor profile:', error);
    res.status(500).json({ error: 'Failed to fetch tutor profile', details: error.message });
  }
};

/**
 * Update tutor profile (bio, expertise, AI persona, etc.)
 */
exports.updateTutorProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { expertise, teachingStyle, bio, aiPersona, isActive } = req.body;

    const updates = {};
    if (expertise) updates.expertise = expertise;
    if (teachingStyle) updates.teaching_style = teachingStyle;
    if (bio !== undefined) updates.bio = bio;
    if (aiPersona) updates.ai_persona = aiPersona;
    if (isActive !== undefined) updates.is_active = isActive;
    
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('tutor_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, tutorProfile: data });
  } catch (error) {
    console.error('Error updating tutor profile:', error);
    res.status(500).json({ error: 'Failed to update tutor profile', details: error.message });
  }
};

/**
 * Create a new Learning Path as a tutor
 */
exports.createLearningPath = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, category, difficulty, estimatedDuration, topics, isPublic } = req.body;

    // Validation
    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Title, description, and category are required' });
    }

    // Verify user is a tutor
    const { data: tutorProfile, error: tutorError } = await supabase
      .from('tutor_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tutorError || !tutorProfile) {
      return res.status(403).json({ error: 'Only tutors can create learning paths' });
    }

    const learningPath = {
      tutor_id: userId,
      title,
      description,
      category,
      difficulty: difficulty || 'beginner',
      estimated_duration: estimatedDuration || 0,
      topics: topics || [],
      is_public: isPublic !== false,
      enrollment_count: 0,
      completion_count: 0,
      rating: 0,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tutor_learning_paths')
      .insert(learningPath)
      .select()
      .single();

    if (error) throw error;

    // Increment tutor's path count
    await supabase
      .from('tutor_profiles')
      .update({ total_paths: tutorProfile.total_paths + 1 })
      .eq('user_id', userId);

    res.json({ success: true, learningPath: data });
  } catch (error) {
    console.error('Error creating learning path:', error);
    res.status(500).json({ error: 'Failed to create learning path', details: error.message });
  }
};

/**
 * Get all learning paths created by the current tutor
 */
exports.getMyLearningPaths = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('tutor_learning_paths')
      .select('*')
      .eq('tutor_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, learningPaths: data || [] });
  } catch (error) {
    console.error('Error fetching tutor learning paths:', error);
    res.status(500).json({ error: 'Failed to fetch learning paths', details: error.message });
  }
};

/**
 * Update a learning path
 */
exports.updateLearningPath = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pathId } = req.params;
    const { title, description, category, difficulty, estimatedDuration, topics, isPublic } = req.body;

    // Verify ownership
    const { data: existingPath, error: fetchError } = await supabase
      .from('tutor_learning_paths')
      .select('*')
      .eq('id', pathId)
      .eq('tutor_id', userId)
      .single();

    if (fetchError || !existingPath) {
      return res.status(404).json({ error: 'Learning path not found or access denied' });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (category) updates.category = category;
    if (difficulty) updates.difficulty = difficulty;
    if (estimatedDuration !== undefined) updates.estimated_duration = estimatedDuration;
    if (topics) updates.topics = topics;
    if (isPublic !== undefined) updates.is_public = isPublic;

    const { data, error } = await supabase
      .from('tutor_learning_paths')
      .update(updates)
      .eq('id', pathId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, learningPath: data });
  } catch (error) {
    console.error('Error updating learning path:', error);
    res.status(500).json({ error: 'Failed to update learning path', details: error.message });
  }
};

/**
 * Delete a learning path
 */
exports.deleteLearningPath = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pathId } = req.params;

    // Verify ownership
    const { data: existingPath, error: fetchError } = await supabase
      .from('tutor_learning_paths')
      .select('*')
      .eq('id', pathId)
      .eq('tutor_id', userId)
      .single();

    if (fetchError || !existingPath) {
      return res.status(404).json({ error: 'Learning path not found or access denied' });
    }

    const { error } = await supabase
      .from('tutor_learning_paths')
      .delete()
      .eq('id', pathId);

    if (error) throw error;

    // Decrement tutor's path count
    const { data: tutorProfile } = await supabase
      .from('tutor_profiles')
      .select('total_paths')
      .eq('user_id', userId)
      .single();

    if (tutorProfile) {
      await supabase
        .from('tutor_profiles')
        .update({ total_paths: Math.max(0, tutorProfile.total_paths - 1) })
        .eq('user_id', userId);
    }

    res.json({ success: true, message: 'Learning path deleted successfully' });
  } catch (error) {
    console.error('Error deleting learning path:', error);
    res.status(500).json({ error: 'Failed to delete learning path', details: error.message });
  }
};

/**
 * Get tutor analytics/statistics
 */
exports.getTutorAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get tutor profile
    const { data: profile, error: profileError } = await supabase
      .from('tutor_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) throw profileError;

    // Get learning paths with enrollments
    const { data: paths, error: pathsError } = await supabase
      .from('tutor_learning_paths')
      .select('*, enrollment_count, completion_count, rating')
      .eq('tutor_id', userId);

    if (pathsError) throw pathsError;

    // Calculate analytics
    const totalEnrollments = paths.reduce((sum, path) => sum + (path.enrollment_count || 0), 0);
    const totalCompletions = paths.reduce((sum, path) => sum + (path.completion_count || 0), 0);
    const averageRating = paths.length > 0
      ? paths.reduce((sum, path) => sum + (path.rating || 0), 0) / paths.length
      : 0;

    const analytics = {
      totalStudents: profile.total_students,
      totalPaths: paths.length,
      totalEnrollments,
      totalCompletions,
      averageRating: averageRating.toFixed(1),
      completionRate: totalEnrollments > 0 ? ((totalCompletions / totalEnrollments) * 100).toFixed(1) : 0,
      recentPaths: paths.slice(0, 5),
      topPerformingPaths: [...paths].sort((a, b) => b.enrollment_count - a.enrollment_count).slice(0, 5)
    };

    res.json({ success: true, analytics });
  } catch (error) {
    console.error('Error fetching tutor analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
  }
};

/**
 * Get public learning paths (for discovery)
 */
exports.getPublicLearningPaths = async (req, res) => {
  try {
    const { category, difficulty, search, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from('tutor_learning_paths')
      .select('*, tutor:tutor_profiles!tutor_id(user_id, bio, expertise)')
      .eq('is_public', true);

    if (category) {
      query = query.eq('category', category);
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    query = query
      .order('enrollment_count', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, learningPaths: data || [] });
  } catch (error) {
    console.error('Error fetching public learning paths:', error);
    res.status(500).json({ error: 'Failed to fetch learning paths', details: error.message });
  }
};
