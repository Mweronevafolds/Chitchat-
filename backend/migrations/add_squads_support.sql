-- Add squad_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS squad_id TEXT DEFAULT 'global';

-- (Optional) You could create a specific table for squads later, 
-- but for now, we can just use string IDs like 'squad-alpha', 'squad-bravo', etc.

-- Update the leaderboard view to include squad_id
CREATE OR REPLACE VIEW public.leaderboards AS
SELECT 
    p.id as user_id,
    p.username,
    p.total_xp,
    p.current_streak,
    p.squad_id, -- Added this
    RANK() OVER (ORDER BY total_xp DESC) as rank
FROM public.profiles p
WHERE total_xp > 0
ORDER BY total_xp DESC;
