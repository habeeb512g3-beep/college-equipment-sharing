-- 1. Update the allowed roles in user_roles.

ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_role_check
CHECK (
    role IN ('student', 'owner_applicant', 'owner', 'admin')
);

ALTER TABLE public.user_roles
ALTER COLUMN role SET DEFAULT 'student';


-- 2. Enable Row Level Security.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;


-- 3. Users can read their own profiles.

DROP POLICY IF EXISTS
"Users can read their own profile"
ON public.profiles;

CREATE POLICY "Users can read their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);


-- 4. Users can read their own roles.

DROP POLICY IF EXISTS
"Users can read their own role"
ON public.user_roles;

CREATE POLICY "Users can read their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);


-- 5. Create automatic account and profile function.

CREATE OR REPLACE FUNCTION public.handle_campusshare_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    account_type text;
    assigned_role text;
BEGIN

    account_type := lower(
        coalesce(
            NEW.raw_user_meta_data->>'account_type',
            'student'
        )
    );

    -- Public registration cannot grant privileged roles.
    IF account_type IN (
        'owner',
        'owner_applicant',
        'staff',
        'faculty',
        'custodian'
    ) THEN
        assigned_role := 'owner_applicant';
    ELSE
        assigned_role := 'student';
    END IF;

    -- Create CampusShare profile.
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        department,
        role
    )
    VALUES (
        NEW.id,
        coalesce(
            nullif(NEW.raw_user_meta_data->>'full_name', ''),
            nullif(NEW.raw_user_meta_data->>'fullName', ''),
            split_part(coalesce(NEW.email, ''), '@', 1)
        ),
        NEW.email,
        coalesce(
            nullif(NEW.raw_user_meta_data->>'department', ''),
            'Not provided'
        ),
        assigned_role
    )
    ON CONFLICT (id) DO NOTHING;

    -- Keep user_roles synchronized.
    INSERT INTO public.user_roles (
        user_id,
        role
    )
    VALUES (
        NEW.id,
        assigned_role
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;

END;
$$;


-- 6. Attach automatic function to Supabase Auth.

DROP TRIGGER IF EXISTS
on_auth_user_created_assign_role
ON auth.users;

DROP TRIGGER IF EXISTS
on_campusshare_auth_user_created
ON auth.users;

CREATE TRIGGER on_campusshare_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_campusshare_new_user();


-- 7. Backfill existing Auth users missing profiles.

INSERT INTO public.profiles (
    id,
    full_name,
    email,
    department,
    role
)
SELECT
    u.id,
    coalesce(
        nullif(u.raw_user_meta_data->>'full_name', ''),
        nullif(u.raw_user_meta_data->>'fullName', ''),
        split_part(coalesce(u.email, ''), '@', 1)
    ),
    u.email,
    coalesce(
        nullif(u.raw_user_meta_data->>'department', ''),
        'Not provided'
    ),
    CASE
        WHEN lower(coalesce(
            u.raw_user_meta_data->>'account_type', ''
        )) IN (
            'owner',
            'owner_applicant',
            'staff',
            'faculty',
            'custodian'
        )
        THEN 'owner_applicant'
        ELSE 'student'
    END
FROM auth.users u
ON CONFLICT (id) DO NOTHING;


-- 8. Backfill missing user_roles records.
-- Existing roles, including admin, remain unchanged.

INSERT INTO public.user_roles (user_id, role)
SELECT
    p.id,
    p.role
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;
