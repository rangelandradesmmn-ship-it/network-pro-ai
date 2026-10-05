-- Insere 500 milhas retroativas para o Super Admin referente a ativação do amigo1
INSERT INTO public.financial_ledger (user_id, matrix_id, from_user_id, level_earned, amount_miles, description, status)
SELECT 
    (SELECT id FROM public.profiles WHERE role = 'SUPER_ADMIN' LIMIT 1),
    NULL,
    (SELECT id FROM public.profiles WHERE name ILIKE '%amigo1%' LIMIT 1),
    0,
    500,
    'Venda de Licença SaaS (Nova Empresa - Retroativo)',
    'APPROVED'
WHERE NOT EXISTS (
    SELECT 1 FROM public.financial_ledger WHERE description LIKE '%SaaS%' AND from_user_id = (SELECT id FROM public.profiles WHERE name ILIKE '%amigo1%' LIMIT 1)
);
