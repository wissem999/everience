USE everience;

INSERT INTO users (nom, email, password_hash, role) VALUES
('Admin', 'admin@everience.com', '$2a$10$v/dctfF20mxo1yNuD5hFXupqwyfP/7EQdh1qvoQjYWfNEYM6EQ6Ra', 'admin'),
('Utilisateur', 'user@everience.com', '$2a$10$H6htBl0OCposnrVmil/XPOMw0Hc9HvdixIpy6Fm8ldhUptncpHIVC', 'user');

INSERT INTO products (num_article, nom, description, prix, stock, stock_min) VALUES
('ART-001', 'Cahier A4', 'Cahier 96 pages petit carreaux', 2.50, 120, 30),
('ART-002', 'Stylo bleu', 'Stylo a bille bleu', 0.80, 15, 20),
('ART-003', 'Ramette A4', 'Ramette 500 feuilles', 4.90, 60, 25);

INSERT INTO fournisseurs (nom, adresse, ville, pays, telephone, mail, groupe) VALUES
('Papeterie Plus', '12 rue des Ecoles', 'Paris', 'France', '0102030405', 'contact@papeterieplus.fr', 'privilegie'),
('Fournitures Pro', '8 avenue Industrielle', 'Lyon', 'France', '0607080910', 'ventes@fourniturespro.fr', 'non');

INSERT INTO clients (nom, adresse, ville, pays, telephone, mail) VALUES
('SARL Dupont', '5 rue de la Paix', 'Paris', 'France', '0143256890', 'contact@sarldupont.fr'),
('Ecole Jules Ferry', '2 place de la Mairie', 'Versailles', 'France', '0139012456', 'secretariat@ecoleferry.fr');
