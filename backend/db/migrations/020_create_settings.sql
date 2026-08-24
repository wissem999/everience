CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(100) PRIMARY KEY,
  `setting_value` TEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('smtp_host', 'smtp.gmail.com'),
('smtp_port', '465'),
('smtp_user', 'YOUR_EMAIL@gmail.com'),
('smtp_pass', 'YOUR_APP_PASSWORD'),
('mail_from', 'YOUR_EMAIL@gmail.com'),
('frontend_url', 'http://localhost:5173'),

('stock_alert_subject', '[Alerte] Article {num_article} en Besoin Actif'),
('stock_alert_body', 'Bonjour,

L''article {num_article} - {nom} est passe en statut "Besoin Actif".

Stock restant : {stock}
Stock minimum : {stock_min}
Quantite a commander : {besoin}

Pour creer la commande, cliquez ici : {link}

Cordialement,
Everience'),

('devis_supplier_subject', 'Demande de devis - Commande {nr_commande}'),
('devis_supplier_body', 'Bonjour,

Nous vous demandons un devis pour la commande suivante :

Commande : {nr_commande}
Article : {num_article} - {article_nom}
Quantite : {nombre}
Date : {date}

Veuillez nous envoyer votre devis (prix unitaire et total) par email.

Cordialement,
Everience'),

('devis_admin_subject', 'Devis a approuver - Commande {nr_commande}'),
('devis_admin_body', 'Bonjour,

Le devis suivant attend votre decision :

Commande : {nr_commande}
Article : {num_article} - {article_nom}
Quantite : {nombre}
Prix unitaire : {prix_unitaire}
Prix total : {prix_total}
Fournisseur : {fournisseur}

Pour decider, ouvrez l''application : {link}

Cordialement,
Everience'),
('devis_admin_html', '<p>Bonjour,</p><p>Le devis suivant attend votre decision :</p><table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px;"><tr><td><b>Commande</b></td><td>{nr_commande}</td></tr><tr><td><b>Article</b></td><td>{num_article} - {article_nom}</td></tr><tr><td><b>Quantite</b></td><td>{nombre}</td></tr><tr><td><b>Prix unitaire</b></td><td>{prix_unitaire}</td></tr><tr><td><b>Prix total</b></td><td>{prix_total}</td></tr><tr><td><b>Fournisseur</b></td><td>{fournisseur}</td></tr></table><p>Pour accepter ou refuser, ouvrez l''application : <a href="{link}">{link}</a></p><p>Cordialement,<br/>Everience</p>');
