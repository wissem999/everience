INSERT INTO settings (setting_key, setting_value) VALUES
('finance_emails', ''),
('commande_approve_subject', 'Commande approuvee - {nr_commande}'),
('commande_approve_body', 'Bonjour,\n\nLa commande suivant a ete approuvee par l''administrateur :\n\nCommande : {nr_commande}\nArticle : {num_article} - {article_nom}\nQuantite : {nombre}\nPrix unitaire : {prix_unitaire}\nPrix total : {prix_total}\nFournisseur : {fournisseur}\nDate : {date}\n\nCordialement,\nEverience'),
('commande_approve_html', '<p>Bonjour,</p><p>La commande suivante a ete approuvee par l''administrateur :</p><table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px;"><tr><td><b>Commande</b></td><td>{nr_commande}</td></tr><tr><td><b>Article</b></td><td>{num_article} - {article_nom}</td></tr><tr><td><b>Quantite</b></td><td>{nombre}</td></tr><tr><td><b>Prix unitaire</b></td><td>{prix_unitaire}</td></tr><tr><td><b>Prix total</b></td><td>{prix_total}</td></tr><tr><td><b>Fournisseur</b></td><td>{fournisseur}</td></tr><tr><td><b>Date</b></td><td>{date}</td></tr></table><p>Cordialement,<br/>Everience</p>')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
