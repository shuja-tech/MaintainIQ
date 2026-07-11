-- =========================================================
-- Optional demo data for MaintainIQ
-- Run AFTER schema.sql, and after you have signed up at least
-- one admin user through the app (so created_by can reference it).
-- =========================================================

insert into public.assets (asset_code, name, category, location, model, condition, status, last_service_date, next_service_date)
values
  ('AST-100001', 'Classroom Projector 01', 'Electronics', 'Building A, Room 204', 'Epson EB-X600', 'Good', 'Operational', '2026-03-01', '2026-09-01'),
  ('AST-100002', 'Lobby AC Unit', 'HVAC', 'Main Lobby', 'Daikin Split 1.5T', 'Fair', 'Operational', '2026-02-15', '2026-08-15'),
  ('AST-100003', 'Server Room UPS', 'Electrical', 'Server Room B', 'APC Smart-UPS 3000', 'Excellent', 'Operational', '2026-01-10', '2026-07-10'),
  ('AST-100004', 'Cafeteria Water Cooler', 'Plumbing', 'Cafeteria', 'Blue Star Aqua', 'Poor', 'Under Maintenance', '2025-12-01', '2026-06-01'),
  ('AST-100005', 'Fire Extinguisher - Hallway 3', 'Safety Equipment', 'Hallway 3', 'CO2 5kg', 'Good', 'Operational', '2026-04-01', '2026-10-01')
on conflict (asset_code) do nothing;

-- Seed a matching history entry for each demo asset
insert into public.asset_history (asset_id, actor, action, details)
select id, 'System', 'Asset registered', 'Seeded as demo data for hackathon evaluation.'
from public.assets
where asset_code like 'AST-1000%'
on conflict do nothing;
