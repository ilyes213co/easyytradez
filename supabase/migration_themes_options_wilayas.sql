-- ==============================================================================
-- Migration: Découplage des Thèmes, Options Produits Dynamiques & 58 Wilayas
-- ==============================================================================

-- 1. Normalisation des thèmes existants dans 'stores' pour éviter les conflits
UPDATE stores 
SET theme = 'monochrome' 
WHERE theme IS NULL 
   OR theme NOT IN (
     'monochrome', 'blossom-lavender', 'phantom', 'playful-pumpkin', 'crimson',
     'natural', 'energetic', 'tuareg-indigo', 'neo-brutalist', 'luxe-noir'
   );

-- 2. Ajout/Mise à jour de la colonne 'theme' sur 'stores'
ALTER TABLE stores ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'monochrome';

ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_theme_check;

ALTER TABLE stores ADD CONSTRAINT stores_theme_check 
  CHECK (theme IN (
    'monochrome', 'blossom-lavender', 'phantom', 'playful-pumpkin', 'crimson',
    'natural', 'energetic', 'tuareg-indigo', 'neo-brutalist', 'luxe-noir'
  ));

-- 3. Ajout de la colonne 'options' JSONB sur 'products'
ALTER TABLE products ADD COLUMN IF NOT EXISTS options jsonb NOT NULL DEFAULT '[]';

-- Commentaire de documentation pour la structure de 'options'
COMMENT ON COLUMN products.options IS 'Options dynamiques [{ "name": "Couleur", "type": "swatch"|"chip", "values": [{ "label": "Rouge", "hex": "#c0392b", "available": true }] }]';

-- 4. Création de la table 'wilayas'
CREATE TABLE IF NOT EXISTS wilayas (
  id int PRIMARY KEY,
  name text NOT NULL,
  price_home int NOT NULL,
  price_desk int NOT NULL,
  eta text NOT NULL
);

-- Activation de RLS pour sécuriser la table wilayas
ALTER TABLE wilayas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wilayas_read_public" ON wilayas;
CREATE POLICY "wilayas_read_public" ON wilayas FOR SELECT USING (true);

-- 5. Remplissage des 58 wilayas d'Algérie avec tarifs et délais COD plausibles
INSERT INTO wilayas (id, name, price_home, price_desk, eta) VALUES
  (1, 'Adrar', 950, 600, '3-5 j'),
  (2, 'Chlef', 550, 300, '24-48h'),
  (3, 'Laghouat', 700, 400, '2-4 j'),
  (4, 'Oum El Bouaghi', 700, 400, '2-4 j'),
  (5, 'Batna', 700, 400, '2-4 j'),
  (6, 'Béjaïa', 700, 400, '2-4 j'),
  (7, 'Biskra', 750, 450, '2-4 j'),
  (8, 'Béchar', 950, 600, '4-6 j'),
  (9, 'Blida', 500, 300, '24-48h'),
  (10, 'Bouira', 550, 300, '24-48h'),
  (11, 'Tamanrasset', 1400, 900, '5-8 j'),
  (12, 'Tébessa', 750, 450, '2-4 j'),
  (13, 'Tlemcen', 550, 300, '48-72h'),
  (14, 'Tiaret', 600, 350, '48-72h'),
  (15, 'Tizi Ouzou', 600, 350, '24-48h'),
  (16, 'Alger', 500, 300, '24-48h'),
  (17, 'Djelfa', 700, 400, '2-4 j'),
  (18, 'Jijel', 700, 400, '2-4 j'),
  (19, 'Sétif', 700, 400, '2-4 j'),
  (20, 'Saïda', 550, 300, '48-72h'),
  (21, 'Skikda', 700, 400, '2-4 j'),
  (22, 'Sidi Bel Abbès', 500, 300, '24-48h'),
  (23, 'Annaba', 750, 450, '2-4 j'),
  (24, 'Guelma', 750, 450, '2-4 j'),
  (25, 'Constantine', 700, 400, '2-4 j'),
  (26, 'Médéa', 600, 350, '24-48h'),
  (27, 'Mostaganem', 450, 280, '24-48h'),
  (28, 'M''Sila', 700, 400, '2-4 j'),
  (29, 'Mascara', 500, 300, '24-48h'),
  (30, 'Ouargla', 900, 550, '3-5 j'),
  (31, 'Oran', 400, 250, '24-48h'),
  (32, 'El Bayadh', 800, 500, '3-5 j'),
  (33, 'Illizi', 1400, 900, '5-8 j'),
  (34, 'Bordj Bou Arreridj', 650, 350, '2-4 j'),
  (35, 'Boumerdès', 550, 300, '24-48h'),
  (36, 'El Tarf', 750, 450, '2-4 j'),
  (37, 'Tindouf', 1400, 900, '5-8 j'),
  (38, 'Tissemsilt', 650, 350, '48-72h'),
  (39, 'El Oued', 850, 500, '3-5 j'),
  (40, 'Khenchela', 750, 450, '2-4 j'),
  (41, 'Souk Ahras', 750, 450, '2-4 j'),
  (42, 'Tipaza', 550, 300, '24-48h'),
  (43, 'Mila', 700, 400, '2-4 j'),
  (44, 'Aïn Defla', 600, 350, '24-48h'),
  (45, 'Naâma', 800, 500, '3-5 j'),
  (46, 'Aïn Témouchent', 450, 280, '24-48h'),
  (47, 'Ghardaïa', 850, 500, '3-5 j'),
  (48, 'Relizane', 500, 300, '24-48h'),
  (49, 'Timimoun', 1000, 650, '4-6 j'),
  (50, 'Bordj Badji Mokhtar', 1500, 1000, '6-8 j'),
  (51, 'Ouled Djellal', 800, 450, '3-5 j'),
  (52, 'Béni Abbès', 1000, 650, '4-6 j'),
  (53, 'In Salah', 1300, 850, '5-7 j'),
  (54, 'In Guezzam', 1500, 1000, '6-8 j'),
  (55, 'Touggourt', 900, 550, '3-5 j'),
  (56, 'Djanet', 1400, 900, '5-8 j'),
  (57, 'El M''Ghair', 850, 500, '3-5 j'),
  (58, 'El Meniaa', 950, 600, '4-6 j')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_home = EXCLUDED.price_home,
  price_desk = EXCLUDED.price_desk,
  eta = EXCLUDED.eta;
