-- Rename column 'periodicity' to 'aggregation' in 'timelines' table
ALTER TABLE timelines RENAME COLUMN periodicity TO aggregation;
