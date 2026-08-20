import nodemailer, { Transporter } from 'nodemailer';
import { pool } from '../config/db';
import * as settingsModel from '../models/settingsModel';

let transporter: Transporter | null = null;
let cachedSettings: Record<string, string> | null = null;

const SETTINGS_KEYS = [
  'smtp_user', 'smtp_pass', 'mail_from',
  'stock_alert_subject', 'stock_alert_body',
  'devis_supplier_subject', 'devis_supplier_body',
  'devis_admin_subject', 'devis_admin_body', 'devis_admin_html',
  'finance_emails',
  'commande_approve_subject', 'commande_approve_body', 'commande_approve_html',
];

export function invalidateSettingsCache() {
  cachedSettings = null;
  transporter = null;
}

async function getSettings(): Promise<Record<string, string>> {
  if (cachedSettings) return cachedSettings;
  const rows = await settingsModel.getMany(SETTINGS_KEYS);
  cachedSettings = rows;
  return cachedSettings;
}

function getTransporterFromSettings(settings: Record<string, string>): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: settings.smtp_user || process.env.SMTP_USER || '',
      pass: settings.smtp_pass || process.env.SMTP_PASS || '',
    },
  });
}

function fillTemplate(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [k, v] of Object.entries(vars)) {
    result = result.replaceAll(`{${k}}`, String(v));
  }
  return result;
}

async function getRecipientEmails(): Promise<string[]> {
  const [rows] = await pool.query('SELECT email FROM users WHERE email IS NOT NULL AND email <> \'\'');
  return (rows as { email: string }[]).map((r) => r.email);
}

async function getAdminEmails(): Promise<string[]> {
  const [rows] = await pool.query(
    "SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL AND email <> ''"
  );
  return (rows as { email: string }[]).map((r) => r.email);
}

function frontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

async function getFinanceEmails(): Promise<string[]> {
  const settings = await getSettings();
  const raw = settings.finance_emails || '';
  return raw.split(',').map((e) => e.trim()).filter((e) => e.length > 0);
}

export interface DevisCommandeInfo {
  id: number;
  nr_commande: string;
  date?: string;
  article_id: number;
  num_article: string;
  article_nom: string;
  nombre: number;
  prix_unitaire?: number | null;
  prix_total?: number | null;
  fournisseur?: string;
  fournisseur_mail?: string;
}

export async function sendStockAlert(article: {
  num_article: string;
  nom: string;
  stock: number;
  stock_min: number;
  id: number;
}) {
  const settings = await getSettings();
  const t = getTransporterFromSettings(settings);
  if (!t) return;
  const emails = await getRecipientEmails();
  if (!emails.length) return;

  const besoin = Math.max(0, article.stock_min - article.stock);
  const link = `${frontendUrl()}/commandes?new=1&article=${article.id}`;

  const subject = fillTemplate(settings.stock_alert_subject || '[Alerte] Article {num_article} en Besoin Actif', {
    num_article: article.num_article,
  });
  const text = fillTemplate(settings.stock_alert_body || 'Bonjour,\n\nL\'article {num_article} - {nom} est passe en statut "Besoin Actif".\n\nStock restant : {stock}\nStock minimum : {stock_min}\nQuantite a commander : {besoin}\n\nPour creer la commande, cliquez ici : {link}\n\nCordialement,\nEverience', {
    num_article: article.num_article,
    nom: article.nom,
    stock: article.stock,
    stock_min: article.stock_min,
    besoin,
    link,
  });

  await t.sendMail({
    from: settings.mail_from || 'no-reply@everience.local',
    to: emails,
    subject,
    text,
  });
  console.log(`[mail] Alerte stock envoyee a ${emails.length} destinataire(s): ${article.num_article}`);
}

export async function sendDemandeDevis(commande: DevisCommandeInfo) {
  const settings = await getSettings();
  const t = getTransporterFromSettings(settings);
  if (!t) return;
  if (!commande.fournisseur_mail) {
    console.warn(`[mail] Fournisseur sans email: ${commande.fournisseur ?? commande.id}`);
    return;
  }

  const subject = fillTemplate(settings.devis_supplier_subject || 'Demande de devis - Commande {nr_commande}', {
    nr_commande: commande.nr_commande,
  });
  const text = fillTemplate(
    settings.devis_supplier_body ||
      'Bonjour,\n\nNous vous demandons un devis pour la commande suivante :\n\nCommande : {nr_commande}\nArticle : {num_article} - {article_nom}\nQuantite : {nombre}\nDate : {date}\n\nVeuillez nous envoyer votre devis (prix unitaire et total) par email.\n\nCordialement,\nEverience',
    {
      nr_commande: commande.nr_commande,
      num_article: commande.num_article,
      article_nom: commande.article_nom,
      nombre: commande.nombre,
      date: commande.date || 'N/A',
    }
  );

  await t.sendMail({
    from: settings.mail_from || 'no-reply@everience.local',
    to: commande.fournisseur_mail,
    subject,
    text,
  });
  console.log(`[mail] Demande de devis envoyee au fournisseur ${commande.fournisseur}: ${commande.nr_commande}`);
}

export async function sendDevisAdmin(commande: DevisCommandeInfo) {
  const settings = await getSettings();
  const t = getTransporterFromSettings(settings);
  if (!t) return;
  const emails = await getAdminEmails();
  if (!emails.length) return;

  const prixUnitaire = commande.prix_unitaire ?? 0;
  const prixTotal = commande.prix_total ?? prixUnitaire * commande.nombre;
  const link = `${frontendUrl()}/commandes`;

  const subject = fillTemplate(settings.devis_admin_subject || 'Devis a approuver - Commande {nr_commande}', {
    nr_commande: commande.nr_commande,
  });

  const vars = {
    nr_commande: commande.nr_commande,
    num_article: commande.num_article,
    article_nom: commande.article_nom,
    nombre: commande.nombre,
    prix_unitaire: prixUnitaire,
    prix_total: prixTotal,
    fournisseur: commande.fournisseur || '',
    link,
  };

  const text = fillTemplate(
    settings.devis_admin_body ||
      'Bonjour,\n\nLe devis suivant attend votre decision :\n\nCommande : {nr_commande}\nArticle : {num_article} - {article_nom}\nQuantite : {nombre}\nPrix unitaire : {prix_unitaire}\nPrix total : {prix_total}\nFournisseur : {fournisseur}\n\nPour decider, ouvrez l\'application : {link}\n\nCordialement,\nEverience',
    vars
  );

  const html = fillTemplate(
    settings.devis_admin_html ||
      '<p>Bonjour,</p><p>Le devis suivant attend votre decision :</p><table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px;"><tr><td><b>Commande</b></td><td>{nr_commande}</td></tr><tr><td><b>Article</b></td><td>{num_article} - {article_nom}</td></tr><tr><td><b>Quantite</b></td><td>{nombre}</td></tr><tr><td><b>Prix unitaire</b></td><td>{prix_unitaire}</td></tr><tr><td><b>Prix total</b></td><td>{prix_total}</td></tr><tr><td><b>Fournisseur</b></td><td>{fournisseur}</td></tr></table><p>Pour accepter ou refuser, ouvrez l\'application : <a href="{link}">{link}</a></p><p>Cordialement,<br/>Everience</p>',
    vars
  );

  await t.sendMail({
    from: settings.mail_from || 'no-reply@everience.local',
    to: emails,
    subject,
    text,
    html,
  });
  console.log(`[mail] Devis envoye a ${emails.length} admin(s): ${commande.nr_commande}`);
}

export async function sendCommandeApprouvee(commande: DevisCommandeInfo) {
  const settings = await getSettings();
  const t = getTransporterFromSettings(settings);
  if (!t) return;
  const emails = await getFinanceEmails();
  if (!emails.length) {
    console.warn('[mail] Aucune email finance configuree');
    return;
  }

  const prixUnitaire = commande.prix_unitaire ?? 0;
  const prixTotal = commande.prix_total ?? prixUnitaire * commande.nombre;

  const vars = {
    nr_commande: commande.nr_commande,
    num_article: commande.num_article,
    article_nom: commande.article_nom,
    nombre: commande.nombre,
    prix_unitaire: prixUnitaire,
    prix_total: prixTotal,
    fournisseur: commande.fournisseur || '',
    date: commande.date || 'N/A',
  };

  const subject = fillTemplate(settings.commande_approve_subject || 'Commande approuvee - {nr_commande}', vars);
  const text = fillTemplate(
    settings.commande_approve_body ||
      'Bonjour,\n\nLa commande suivante a ete approuvee :\n\nCommande : {nr_commande}\nArticle : {num_article} - {article_nom}\nQuantite : {nombre}\nPrix unitaire : {prix_unitaire}\nPrix total : {prix_total}\nFournisseur : {fournisseur}\nDate : {date}\n\nCordialement,\nEverience',
    vars
  );
  const html = fillTemplate(
    settings.commande_approve_html ||
      '<p>Bonjour,</p><p>La commande suivante a ete approuvee :</p><table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px;"><tr><td><b>Commande</b></td><td>{nr_commande}</td></tr><tr><td><b>Article</b></td><td>{num_article} - {article_nom}</td></tr><tr><td><b>Quantite</b></td><td>{nombre}</td></tr><tr><td><b>Prix unitaire</b></td><td>{prix_unitaire}</td></tr><tr><td><b>Prix total</b></td><td>{prix_total}</td></tr><tr><td><b>Fournisseur</b></td><td>{fournisseur}</td></tr><tr><td><b>Date</b></td><td>{date}</td></tr></table><p>Cordialement,<br/>Everience</p>',
    vars
  );

  await t.sendMail({
    from: settings.mail_from || 'no-reply@everience.local',
    to: emails,
    subject,
    text,
    html,
  });
  console.log(`[mail] Commande approuvee envoyee a ${emails.length} email(s) finance: ${commande.nr_commande}`);
}

export async function checkStockAlert(articleId: number, before: number, after: number) {
  if (before <= after) return;
  const [rows] = await pool.query(
    'SELECT id, num_article, nom, stock_min FROM products WHERE id = ?',
    [articleId]
  );
  const article = (rows as { id: number; num_article: string; nom: string; stock_min: number }[])[0];
  if (!article) return;
  if (before > article.stock_min && after <= article.stock_min) {
    try {
      await sendStockAlert({
        id: article.id,
        num_article: article.num_article,
        nom: article.nom,
        stock: after,
        stock_min: article.stock_min,
      });
    } catch (err) {
      console.error('[mail] Echec envoi alerte stock:', err);
    }
  }
}
