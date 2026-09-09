-- Renomear coluna existente
ALTER TABLE persons RENAME COLUMN name TO person_name;

-- Adicionar novos campos
ALTER TABLE persons ADD COLUMN obligator_identification TEXT NOT NULL DEFAULT '';
ALTER TABLE persons ADD COLUMN birth_date DATE;
ALTER TABLE persons ADD COLUMN observation TEXT;
