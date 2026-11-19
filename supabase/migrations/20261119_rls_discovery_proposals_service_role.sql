-- discovery_proposals: policy service_role_all byla omylem pro roli public (cmd ALL, USING true)
-- → veřejný anon klíč mohl tabulku číst i zapisovat. service_role RLS obchází, policy stačí omezit.
ALTER POLICY service_role_all ON public.discovery_proposals TO service_role;
