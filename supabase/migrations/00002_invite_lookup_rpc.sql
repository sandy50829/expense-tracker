-- RPC function for looking up notebooks by invite code
-- Bypasses RLS since non-members need to see notebook info before joining
CREATE OR REPLACE FUNCTION lookup_notebook_by_invite(invite text)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  icon text,
  default_currency text,
  invite_code text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.id, n.name, n.description, n.icon, n.default_currency, n.invite_code
  FROM notebooks n
  WHERE n.invite_code = invite
  LIMIT 1;
$$;
