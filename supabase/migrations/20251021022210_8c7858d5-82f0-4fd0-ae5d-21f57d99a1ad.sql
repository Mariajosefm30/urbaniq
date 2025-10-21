-- Copy the Las Palmeras building to the old buildings table so profiles can reference it
INSERT INTO buildings (id, name, address)
SELECT id, name, CONCAT_WS(', ', street_address, city, country) as address
FROM buildings_new
WHERE id = '663ec7d4-8c00-46f9-9880-6d8e069a3305'
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    address = EXCLUDED.address;