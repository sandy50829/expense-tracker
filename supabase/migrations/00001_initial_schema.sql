-- =============================================================================
-- Expense Tracker - Initial Schema Migration
-- Refs: specs/db-schema.md
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 2. notebooks
-- ---------------------------------------------------------------------------
CREATE TABLE notebooks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  description      text,
  default_currency text NOT NULL DEFAULT 'TWD',
  icon             text NOT NULL DEFAULT 'book',
  invite_code      text UNIQUE NOT NULL,
  created_by       uuid NOT NULL REFERENCES profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notebooks_select_member"
  ON notebooks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notebook_members
      WHERE notebook_members.notebook_id = notebooks.id
        AND notebook_members.user_id = auth.uid()
    )
  );

CREATE POLICY "notebooks_insert_authenticated"
  ON notebooks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "notebooks_update_owner"
  ON notebooks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notebook_members
      WHERE notebook_members.notebook_id = notebooks.id
        AND notebook_members.user_id = auth.uid()
        AND notebook_members.role = 'owner'
    )
  );

CREATE POLICY "notebooks_delete_owner"
  ON notebooks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notebook_members
      WHERE notebook_members.notebook_id = notebooks.id
        AND notebook_members.user_id = auth.uid()
        AND notebook_members.role = 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. notebook_members
-- ---------------------------------------------------------------------------
CREATE TABLE notebook_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id),
  role        text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notebook_id, user_id)
);

ALTER TABLE notebook_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notebook_members_select_member"
  ON notebook_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notebook_members AS nm
      WHERE nm.notebook_id = notebook_members.notebook_id
        AND nm.user_id = auth.uid()
    )
  );

CREATE POLICY "notebook_members_insert_authenticated"
  ON notebook_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notebook_members_delete_self_or_owner"
  ON notebook_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM notebook_members AS nm
      WHERE nm.notebook_id = notebook_members.notebook_id
        AND nm.user_id = auth.uid()
        AND nm.role = 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. expenses
-- ---------------------------------------------------------------------------
CREATE TABLE expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id   uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  description   text NOT NULL,
  amount        numeric(12,2) NOT NULL CHECK (amount > 0),
  currency      text NOT NULL DEFAULT 'TWD',
  category      text NOT NULL DEFAULT 'other'
                  CHECK (category IN ('food', 'transport', 'lodging', 'shopping', 'entertainment', 'other')),
  split_type    text NOT NULL DEFAULT 'equal'
                  CHECK (split_type IN ('equal', 'percentage', 'exact')),
  paid_by       uuid NOT NULL REFERENCES profiles(id),
  expense_date  date NOT NULL DEFAULT CURRENT_DATE,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_select_member"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notebook_members
      WHERE notebook_members.notebook_id = expenses.notebook_id
        AND notebook_members.user_id = auth.uid()
    )
  );

CREATE POLICY "expenses_insert_member"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notebook_members
      WHERE notebook_members.notebook_id = expenses.notebook_id
        AND notebook_members.user_id = auth.uid()
    )
  );

CREATE POLICY "expenses_update_creator_or_owner"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    paid_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM notebook_members
      WHERE notebook_members.notebook_id = expenses.notebook_id
        AND notebook_members.user_id = auth.uid()
        AND notebook_members.role = 'owner'
    )
  );

CREATE POLICY "expenses_delete_creator_or_owner"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    paid_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM notebook_members
      WHERE notebook_members.notebook_id = expenses.notebook_id
        AND notebook_members.user_id = auth.uid()
        AND notebook_members.role = 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- 5. expense_splits
-- ---------------------------------------------------------------------------
CREATE TABLE expense_splits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id),
  amount      numeric(12,2) NOT NULL CHECK (amount >= 0),
  is_settled  boolean NOT NULL DEFAULT false,
  UNIQUE (expense_id, user_id)
);

ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_splits_select_member"
  ON expense_splits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      JOIN notebook_members ON notebook_members.notebook_id = expenses.notebook_id
      WHERE expenses.id = expense_splits.expense_id
        AND notebook_members.user_id = auth.uid()
    )
  );

CREATE POLICY "expense_splits_insert_member"
  ON expense_splits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses
      JOIN notebook_members ON notebook_members.notebook_id = expenses.notebook_id
      WHERE expenses.id = expense_splits.expense_id
        AND notebook_members.user_id = auth.uid()
    )
  );

CREATE POLICY "expense_splits_update_creator_or_owner"
  ON expense_splits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      JOIN notebook_members ON notebook_members.notebook_id = expenses.notebook_id
      WHERE expenses.id = expense_splits.expense_id
        AND (expenses.paid_by = auth.uid() OR notebook_members.role = 'owner')
        AND notebook_members.user_id = auth.uid()
    )
  );

CREATE POLICY "expense_splits_delete_creator_or_owner"
  ON expense_splits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      JOIN notebook_members ON notebook_members.notebook_id = expenses.notebook_id
      WHERE expenses.id = expense_splits.expense_id
        AND (expenses.paid_by = auth.uid() OR notebook_members.role = 'owner')
        AND notebook_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 6. settlements
-- ---------------------------------------------------------------------------
CREATE TABLE settlements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id  uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  from_user    uuid NOT NULL REFERENCES profiles(id),
  to_user      uuid NOT NULL REFERENCES profiles(id),
  amount       numeric(12,2) NOT NULL CHECK (amount > 0),
  currency     text NOT NULL,
  settled_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (from_user != to_user)
);

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settlements_select_member"
  ON settlements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notebook_members
      WHERE notebook_members.notebook_id = settlements.notebook_id
        AND notebook_members.user_id = auth.uid()
    )
  );

CREATE POLICY "settlements_insert_member_self"
  ON settlements FOR INSERT
  TO authenticated
  WITH CHECK (
    (from_user = auth.uid() OR to_user = auth.uid())
    AND EXISTS (
      SELECT 1 FROM notebook_members
      WHERE notebook_members.notebook_id = settlements.notebook_id
        AND notebook_members.user_id = auth.uid()
    )
  );

CREATE POLICY "settlements_delete_involved"
  ON settlements FOR DELETE
  TO authenticated
  USING (from_user = auth.uid() OR to_user = auth.uid());

-- ---------------------------------------------------------------------------
-- 7. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_notebook_members_notebook ON notebook_members(notebook_id);
CREATE INDEX idx_notebook_members_user ON notebook_members(user_id);
CREATE INDEX idx_expenses_notebook ON expenses(notebook_id);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX idx_settlements_notebook ON settlements(notebook_id);

-- ---------------------------------------------------------------------------
-- 8. Functions & Triggers
-- ---------------------------------------------------------------------------

-- 8.1 Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      SPLIT_PART(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 8.2 Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER notebooks_updated_at
  BEFORE UPDATE ON notebooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 8.3 Auto-add creator as owner on notebook creation
CREATE OR REPLACE FUNCTION handle_new_notebook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notebook_members (notebook_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_notebook_created
  AFTER INSERT ON notebooks
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_notebook();

-- ---------------------------------------------------------------------------
-- 9. Enable Realtime for key tables
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE settlements;
