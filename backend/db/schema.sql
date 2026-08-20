CREATE DATABASE IF NOT EXISTS everience CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE everience;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','user') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  num_article VARCHAR(50) NOT NULL,
  nom VARCHAR(150) NOT NULL,
  description TEXT,
  prix DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  stock_min INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fournisseurs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(150) NOT NULL,
  adresse VARCHAR(255),
  ville VARCHAR(100),
  pays VARCHAR(100),
  telephone VARCHAR(30),
  mail VARCHAR(150),
  groupe ENUM('privilegie','non') NOT NULL DEFAULT 'non',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(150) NOT NULL,
  adresse VARCHAR(255),
  ville VARCHAR(100),
  pays VARCHAR(100),
  telephone VARCHAR(30),
  mail VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('entree','sortie') NOT NULL,
  nr_facture VARCHAR(100),
  nr_bon_commande VARCHAR(100),
  fournisseur_id INT NULL,
  client_id INT NULL,
  article_id INT NOT NULL,
  nombre INT NOT NULL DEFAULT 0,
  date DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_fournisseur FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_article FOREIGN KEY (article_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS commandes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nr_commande VARCHAR(50) NOT NULL UNIQUE,
  date DATETIME NOT NULL,
  article_id INT NOT NULL,
  nombre INT NOT NULL DEFAULT 0,
  prix_unitaire DECIMAL(10,2) NULL,
  prix_total DECIMAL(10,2) NULL,
  fournisseur_id INT NOT NULL,
  controle TINYINT(1) NOT NULL DEFAULT 1,
  statut ENUM('en_attente','soumis','approuve','refuse') NOT NULL DEFAULT 'en_attente',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_commande_article FOREIGN KEY (article_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_commande_fournisseur FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id) ON DELETE RESTRICT,
  CONSTRAINT fk_commande_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
