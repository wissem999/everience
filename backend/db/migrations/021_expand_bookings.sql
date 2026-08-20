ALTER TABLE `bookings`
  MODIFY `type` ENUM('entree','sortie','retour','corbeille','recuperation') NOT NULL;

ALTER TABLE `bookings`
  ADD COLUMN `retour_condition` ENUM('bon','endommage') NULL DEFAULT NULL AFTER `type`;
