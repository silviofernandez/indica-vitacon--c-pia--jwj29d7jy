-- ============================================================================
-- INDICA GABRIEL — PLATAFORMA DE INDICAÇÕES IMOBILIÁRIAS
-- Schema DDL PostgreSQL / Supabase para as 9 tabelas do sistema
-- ============================================================================

-- Habilita extensão para UUIDs se ainda não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TEAMS (Equipas / Times de Vendas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    leader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_leader ON public.teams (leader_id);
CREATE INDEX IF NOT EXISTS idx_teams_active ON public.teams (active);

-- ============================================================================
-- 2. PROFILES (Perfis de usuário estendendo auth.users)
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('indicador', 'master', 'operator', 'manager');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role user_role_enum NOT NULL DEFAULT 'indicador',
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_team ON public.profiles (team_id);

-- ============================================================================
-- 3. INDICATORS (Perfil e dados cadastrais/financeiros do Indicador)
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE pix_key_type_enum AS ENUM ('cpf', 'cnpj', 'email', 'phone', 'random');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    cpf_cnpj TEXT,
    phone TEXT,
    pix_key TEXT,
    pix_key_type pix_key_type_enum,
    bank_info JSONB DEFAULT '{}'::jsonb,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_indicators_user ON public.indicators (user_id);
CREATE INDEX IF NOT EXISTS idx_indicators_approved ON public.indicators (approved);

-- ============================================================================
-- 4. TEAM_MEMBERS (Membros e lideranças das equipas)
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE team_role_enum AS ENUM ('leader', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_in_team team_role_enum NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_team_user UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members (user_id);

-- ============================================================================
-- 5. REFERRALS (Indicações Imobiliárias — Entidade Central)
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE property_type_enum AS ENUM ('rental', 'sale', 'vitacon');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE referral_status_enum AS ENUM (
        'sent',
        'in_analysis',
        'visited',
        'negotiating',
        'closed_won',
        'closed_lost'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE RESTRICT,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    property_description TEXT,
    property_type property_type_enum NOT NULL DEFAULT 'sale',
    expected_value NUMERIC(12, 2),
    status referral_status_enum NOT NULL DEFAULT 'sent',
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_indicator ON public.referrals (indicator_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals (status);
CREATE INDEX IF NOT EXISTS idx_referrals_assigned ON public.referrals (assigned_to);
CREATE INDEX IF NOT EXISTS idx_referrals_property_type ON public.referrals (property_type);

-- ============================================================================
-- 6. REFERRAL_STATUS_HISTORY (Histórico de alterações e auditoria de status)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.referral_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refhist_referral ON public.referral_status_history (referral_id);
CREATE INDEX IF NOT EXISTS idx_refhist_changedby ON public.referral_status_history (changed_by);

-- ============================================================================
-- 7. BONUSES (Bônus e Comissões de Indicações)
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE bonus_type_enum AS ENUM ('rental_fixed', 'buyer_percent', 'sale_percent', 'vitacon_percent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE bonus_status_enum AS ENUM ('pending', 'approved', 'paid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.bonuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE RESTRICT,
    indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE RESTRICT,
    bonus_type bonus_type_enum NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status bonus_status_enum NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bonuses_referral ON public.bonuses (referral_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_indicator ON public.bonuses (indicator_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_status ON public.bonuses (status);

-- ============================================================================
-- 8. BONUS_SETTINGS (Tabela Chave/Valor de Parâmetros de Recompensa)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bonus_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bonus_settings_key ON public.bonus_settings (key);

-- Seed idempotente das configurações iniciais de bônus
INSERT INTO public.bonus_settings (key, value, description)
VALUES
    ('rental_fixed_amount', '200', 'Valor fixo padrão (R$) pago ao indicador por locação concluída com sucesso'),
    ('buyer_percent', '0.5', 'Percentual (%) de bônus sobre o valor da transação para indicação de comprador'),
    ('sale_percent', '1', 'Percentual (%) de bônus sobre o valor da transação para indicação de venda/proprietário'),
    ('vitacon_percent', '1', 'Percentual (%) de bônus sobre unidades ou projetos parceiros Vitacon')
ON CONFLICT (key) DO UPDATE
SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================================================
-- 9. NOTIFICATIONS_LOG (Log de Notificações do Sistema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_id UUID REFERENCES public.referrals(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications_log (user_id);
CREATE INDEX IF NOT EXISTS idx_notif_referral ON public.notifications_log (referral_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON public.notifications_log (read);

-- ============================================================================
-- RLS E AUTENTICAÇÃO (Row Level Security & Políticas de Controle de Acesso)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Função auxiliar: current_user_role()
-- Retorna o papel (role) do usuário autenticado no auth.uid() a partir de profiles.
-- Definida com SECURITY DEFINER e STABLE para evitar recursão infinita e garantir
-- performance consistente durante a avaliação das políticas de RLS.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_user_role() IS
'Retorna o role do usuário autenticado (indicador, master, operator, manager) consultando profiles.';

-- ----------------------------------------------------------------------------
-- Habilitação obrigatória de RLS em TODAS as 9 tabelas do modelo
-- ----------------------------------------------------------------------------
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 1. POLICIES: TEAMS
-- Leitura para qualquer autenticado (menus, dashboards e filtros de equipe).
-- Escrita (INSERT, UPDATE, DELETE) restrita a administradores (master).
-- ============================================================================
CREATE POLICY "teams_select_authenticated"
    ON public.teams FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "teams_insert_master"
    ON public.teams FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_role() = 'master');

CREATE POLICY "teams_update_master"
    ON public.teams FOR UPDATE
    TO authenticated
    USING (public.current_user_role() = 'master')
    WITH CHECK (public.current_user_role() = 'master');

CREATE POLICY "teams_delete_master"
    ON public.teams FOR DELETE
    TO authenticated
    USING (public.current_user_role() = 'master');

-- ============================================================================
-- 2. POLICIES: PROFILES
-- Leitura para autenticados (necessário para exibição de nomes, papéis e menus).
-- Criação permitida para o próprio usuário ao cadastrar-se ou pelo master.
-- Atualização: usuário pode atualizar seus próprios dados (nome, phone, etc.),
-- porém a alteração de role/team_id é reservada para master.
-- Exclusão: apenas master.
-- ============================================================================
CREATE POLICY "profiles_select_authenticated"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "profiles_insert_own_or_master"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        OR public.current_user_role() = 'master'
    );

CREATE POLICY "profiles_update_own_or_master"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.current_user_role() = 'master'
    )
    WITH CHECK (
        public.current_user_role() = 'master'
        OR (
            auth.uid() = user_id
            AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
            AND team_id IS NOT DISTINCT FROM (SELECT p.team_id FROM public.profiles p WHERE p.user_id = auth.uid())
        )
    );

CREATE POLICY "profiles_delete_master"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (public.current_user_role() = 'master');

-- ============================================================================
-- 3. POLICIES: INDICATORS
-- Cadastro público (anon INSERT): permite que qualquer visitante crie seu cadastro
-- Leitura: indicador vê apenas o seu registro; operator, manager e master veem todos.
-- Atualização/Exclusão: apenas o próprio dono ou master.
-- ============================================================================
CREATE POLICY "indicators_insert_anon_and_auth"
    ON public.indicators FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "indicators_select_by_role"
    ON public.indicators FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.current_user_role() IN ('operator', 'manager', 'master')
    );

CREATE POLICY "indicators_update_own_or_master"
    ON public.indicators FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.current_user_role() = 'master'
    )
    WITH CHECK (
        auth.uid() = user_id
        OR public.current_user_role() = 'master'
    );

CREATE POLICY "indicators_delete_own_or_master"
    ON public.indicators FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.current_user_role() = 'master'
    );

-- ============================================================================
-- 4. POLICIES: TEAM_MEMBERS
-- Leitura para autenticados (listagens de equipes e membros).
-- Escrita (INSERT, UPDATE, DELETE) restrita a master.
-- ============================================================================
CREATE POLICY "team_members_select_authenticated"
    ON public.team_members FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "team_members_insert_master"
    ON public.team_members FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_role() = 'master');

CREATE POLICY "team_members_update_master"
    ON public.team_members FOR UPDATE
    TO authenticated
    USING (public.current_user_role() = 'master')
    WITH CHECK (public.current_user_role() = 'master');

CREATE POLICY "team_members_delete_master"
    ON public.team_members FOR DELETE
    TO authenticated
    USING (public.current_user_role() = 'master');

-- ============================================================================
-- 5. POLICIES: REFERRALS
-- Leitura:
-- - Indicador vê APENAS suas próprias indicações (via indicator_id -> user_id)
-- - Operator vê TODAS as indicações
-- - Manager vê as atribuídas a ele (assigned_to) e as de membros da sua equipe
-- - Master vê TUDO
-- Escrita:
-- - INSERT: indicador pode criar referral apontando para o seu indicator_id;
--           master/operator também podem inserir indicações diretamente.
-- - UPDATE/DELETE: master vê e edita tudo (operações sensíveis de alteração central).
-- ============================================================================
CREATE POLICY "referrals_select_by_role"
    ON public.referrals FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() = 'master'
        OR public.current_user_role() = 'operator'
        OR (
            public.current_user_role() = 'indicador'
            AND indicator_id IN (
                SELECT ind.id FROM public.indicators ind WHERE ind.user_id = auth.uid()
            )
        )
        OR (
            public.current_user_role() = 'manager'
            AND (
                assigned_to = auth.uid()
                OR assigned_to IN (
                    SELECT tm.user_id
                    FROM public.team_members tm
                    WHERE tm.team_id IN (
                        SELECT p.team_id FROM public.profiles p WHERE p.user_id = auth.uid()
                        UNION
                        SELECT t.id FROM public.teams t WHERE t.leader_id = auth.uid()
                    )
                )
            )
        )
    );

CREATE POLICY "referrals_insert_by_role"
    ON public.referrals FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_role() IN ('master', 'operator')
        OR (
            public.current_user_role() = 'indicador'
            AND indicator_id IN (
                SELECT ind.id FROM public.indicators ind WHERE ind.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "referrals_update_master"
    ON public.referrals FOR UPDATE
    TO authenticated
    USING (public.current_user_role() = 'master')
    WITH CHECK (public.current_user_role() = 'master');

CREATE POLICY "referrals_delete_master"
    ON public.referrals FOR DELETE
    TO authenticated
    USING (public.current_user_role() = 'master');

-- ============================================================================
-- 6. POLICIES: REFERRAL_STATUS_HISTORY
-- Leitura espelha a visibilidade do referral pai (referral_id).
-- Escrita (INSERT): staff (master e operator) para registro de histórico.
-- UPDATE / DELETE: apenas master.
-- ============================================================================
CREATE POLICY "referral_status_history_select_by_role"
    ON public.referral_status_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.referrals r
            WHERE r.id = referral_status_history.referral_id
        )
    );

CREATE POLICY "referral_status_history_insert_staff"
    ON public.referral_status_history FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_role() IN ('master', 'operator'));

CREATE POLICY "referral_status_history_update_master"
    ON public.referral_status_history FOR UPDATE
    TO authenticated
    USING (public.current_user_role() = 'master')
    WITH CHECK (public.current_user_role() = 'master');

CREATE POLICY "referral_status_history_delete_master"
    ON public.referral_status_history FOR DELETE
    TO authenticated
    USING (public.current_user_role() = 'master');

-- ============================================================================
-- 7. POLICIES: BONUSES
-- Leitura:
-- - Indicador vê apenas os bônus associados ao seu indicator_id
-- - Operator vê todos os bônus
-- - Manager vê os bônus vinculados às indicações atribuídas ou de membros da sua equipe
-- - Master vê tudo
-- Escrita (INSERT, UPDATE, DELETE): restrita a master.
-- ============================================================================
CREATE POLICY "bonuses_select_by_role"
    ON public.bonuses FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() = 'master'
        OR public.current_user_role() = 'operator'
        OR (
            public.current_user_role() = 'indicador'
            AND indicator_id IN (
                SELECT ind.id FROM public.indicators ind WHERE ind.user_id = auth.uid()
            )
        )
        OR (
            public.current_user_role() = 'manager'
            AND referral_id IN (
                SELECT r.id FROM public.referrals r
                WHERE r.assigned_to = auth.uid()
                   OR r.assigned_to IN (
                       SELECT tm.user_id
                       FROM public.team_members tm
                       WHERE tm.team_id IN (
                           SELECT p.team_id FROM public.profiles p WHERE p.user_id = auth.uid()
                           UNION
                           SELECT t.id FROM public.teams t WHERE t.leader_id = auth.uid()
                       )
                   )
            )
        )
    );

CREATE POLICY "bonuses_insert_master"
    ON public.bonuses FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_role() = 'master');

CREATE POLICY "bonuses_update_master"
    ON public.bonuses FOR UPDATE
    TO authenticated
    USING (public.current_user_role() = 'master')
    WITH CHECK (public.current_user_role() = 'master');

CREATE POLICY "bonuses_delete_master"
    ON public.bonuses FOR DELETE
    TO authenticated
    USING (public.current_user_role() = 'master');

-- ============================================================================
-- 8. POLICIES: BONUS_SETTINGS
-- Leitura para qualquer autenticado (a tela /admin/configuracoes lê os 4 parâmetros).
-- Escrita (INSERT, UPDATE, DELETE): apenas master.
-- ============================================================================
CREATE POLICY "bonus_settings_select_authenticated"
    ON public.bonus_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "bonus_settings_insert_master"
    ON public.bonus_settings FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_role() = 'master');

CREATE POLICY "bonus_settings_update_master"
    ON public.bonus_settings FOR UPDATE
    TO authenticated
    USING (public.current_user_role() = 'master')
    WITH CHECK (public.current_user_role() = 'master');

CREATE POLICY "bonus_settings_delete_master"
    ON public.bonus_settings FOR DELETE
    TO authenticated
    USING (public.current_user_role() = 'master');

-- ============================================================================
-- 9. POLICIES: NOTIFICATIONS_LOG
-- Leitura: usuário autenticado vê apenas as suas notificações (user_id = auth.uid());
--          master vê todas.
-- Escrita (INSERT, UPDATE, DELETE): restrita a master (ou processos internos/serviço).
-- ============================================================================
CREATE POLICY "notifications_log_select_own_or_master"
    ON public.notifications_log FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.current_user_role() = 'master'
    );

CREATE POLICY "notifications_log_insert_master"
    ON public.notifications_log FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_role() = 'master');

CREATE POLICY "notifications_log_update_master"
    ON public.notifications_log FOR UPDATE
    TO authenticated
    USING (public.current_user_role() = 'master')
    WITH CHECK (public.current_user_role() = 'master');

CREATE POLICY "notifications_log_delete_master"
    ON public.notifications_log FOR DELETE
    TO authenticated
    USING (public.current_user_role() = 'master');
