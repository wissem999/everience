CREATE TABLE IF NOT EXISTS inventaire (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_serie VARCHAR(100) NOT NULL,
  article_id INT NOT NULL,
  statut ENUM('stock','affecte') NOT NULL DEFAULT 'stock',
  client_id INT NULL,
  employee_name VARCHAR(150) NULL,
  date_affectation DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX uniq_serie_article (numero_serie, article_id)
);
