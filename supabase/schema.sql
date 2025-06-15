-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'todo',
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    assignee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create memberships table (many-to-many relationship between users and projects)
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, project_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_project_id ON public.memberships(project_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER handle_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_memberships_updated_at BEFORE UPDATE ON public.memberships
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see and modify their own data
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Projects: Users can see projects they own or are members of
CREATE POLICY "Users can view own projects" ON public.projects
    FOR SELECT USING (
        auth.uid()::text = owner_id::text 
        OR EXISTS (
            SELECT 1 FROM public.memberships 
            WHERE project_id = id 
            AND user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can create projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid()::text = owner_id::text);

CREATE POLICY "Users can update own projects" ON public.projects
    FOR UPDATE USING (auth.uid()::text = owner_id::text);

CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE USING (auth.uid()::text = owner_id::text);

-- Tasks: Users can see tasks in projects they have access to
CREATE POLICY "Users can view project tasks" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id 
            AND (
                owner_id::text = auth.uid()::text 
                OR EXISTS (
                    SELECT 1 FROM public.memberships 
                    WHERE project_id = projects.id 
                    AND user_id::text = auth.uid()::text
                )
            )
        )
    );

CREATE POLICY "Users can create tasks in accessible projects" ON public.tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id 
            AND (
                owner_id::text = auth.uid()::text 
                OR EXISTS (
                    SELECT 1 FROM public.memberships 
                    WHERE project_id = projects.id 
                    AND user_id::text = auth.uid()::text
                )
            )
        )
    );

CREATE POLICY "Users can update tasks in accessible projects" ON public.tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id 
            AND (
                owner_id::text = auth.uid()::text 
                OR EXISTS (
                    SELECT 1 FROM public.memberships 
                    WHERE project_id = projects.id 
                    AND user_id::text = auth.uid()::text
                )
            )
        )
    );

CREATE POLICY "Users can delete tasks in accessible projects" ON public.tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id 
            AND (
                owner_id::text = auth.uid()::text 
                OR EXISTS (
                    SELECT 1 FROM public.memberships 
                    WHERE project_id = projects.id 
                    AND user_id::text = auth.uid()::text
                )
            )
        )
    );

-- Memberships: Users can see memberships for projects they have access to
CREATE POLICY "Users can view project memberships" ON public.memberships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id 
            AND (
                owner_id::text = auth.uid()::text 
                OR EXISTS (
                    SELECT 1 FROM public.memberships m2
                    WHERE m2.project_id = projects.id 
                    AND m2.user_id::text = auth.uid()::text
                )
            )
        )
    );

CREATE POLICY "Project owners can manage memberships" ON public.memberships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id 
            AND owner_id::text = auth.uid()::text
        )
    );

-- Insert sample data (optional)
INSERT INTO public.users (id, email) VALUES 
    ('123e4567-e89b-12d3-a456-426614174000', 'user1@example.com'),
    ('123e4567-e89b-12d3-a456-426614174001', 'user2@example.com'),
    ('123e4567-e89b-12d3-a456-426614174002', 'user3@example.com')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.projects (id, name, description, owner_id) VALUES 
    ('223e4567-e89b-12d3-a456-426614174000', 'Project Alpha', 'First project description', '123e4567-e89b-12d3-a456-426614174000'),
    ('223e4567-e89b-12d3-a456-426614174001', 'Project Beta', 'Second project description', '123e4567-e89b-12d3-a456-426614174001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks (id, title, description, status, project_id, assignee_id) VALUES 
    ('323e4567-e89b-12d3-a456-426614174000', 'Setup Database', 'Configure database schema', 'todo', '223e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174000'),
    ('323e4567-e89b-12d3-a456-426614174001', 'Create API', 'Build REST API endpoints', 'in-progress', '223e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'),
    ('323e4567-e89b-12d3-a456-426614174002', 'Design UI', 'Create user interface mockups', 'done', '223e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.memberships (user_id, project_id) VALUES 
    ('123e4567-e89b-12d3-a456-426614174001', '223e4567-e89b-12d3-a456-426614174000'),
    ('123e4567-e89b-12d3-a456-426614174002', '223e4567-e89b-12d3-a456-426614174000')
ON CONFLICT (user_id, project_id) DO NOTHING;
